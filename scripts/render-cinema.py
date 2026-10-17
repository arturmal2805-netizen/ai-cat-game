#!/usr/bin/env python3
"""Render three original SpongeBob shorts, not excerpts from television episodes.

Offline artwork/animation: Pillow; audio synthesis: NumPy; encode: FFmpeg.
No runtime canvas renderer, external media service or downloaded soundtrack.
Run: python3 scripts/render-cinema.py [--stills]
"""
import argparse
import math
import pathlib
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public/media/cinema"
W, H, FPS, AA = 960, 540, 24, 1.5
INK = "#22475e"
FONT = "/usr/share/fonts/truetype/open-sans/OpenSans-Bold.ttf"
STORIES = [
    ("sponge-bubbles", "Пузырь для Гэри", 18),
    ("sponge-burger", "Большой крабсбургер", 20),
    ("sponge-jellyfish", "Танец медуз", 18),
]


def ease(x):
    x = max(0, min(1, x))
    return x*x*(3-2*x)


class Art:
    def __init__(self, image=None):
        self.im = image.copy() if image else Image.new("RGB", (int(W*AA), int(H*AA)))
        self.d = ImageDraw.Draw(self.im)

    def xy(self, v):
        return tuple(round(x*AA) for x in v)

    def ellipse(self, box, color, outline=None, width=2):
        self.d.ellipse(self.xy(box), fill=color, outline=outline, width=round(width*AA))

    def rect(self, box, color, radius=0, outline=None, width=2):
        self.d.rounded_rectangle(self.xy(box), round(radius*AA), fill=color,
                                 outline=outline, width=round(width*AA))

    def line(self, points, color, width=3):
        self.d.line([self.xy(p) for p in points], fill=color, width=round(width*AA), joint="curve")

    def poly(self, points, color, outline=None, width=2):
        self.d.polygon([self.xy(p) for p in points], fill=color)
        if outline:
            self.line(points+[points[0]], outline, width)

    def arc(self, box, start, end, color, width=3):
        self.d.arc(self.xy(box), start, end, fill=color, width=round(width*AA))

    def text(self, text, x, y, size=25, color=INK, anchor="mm"):
        self.d.text(self.xy((x, y)), text, font=ImageFont.truetype(FONT, round(size*AA)),
                    fill=color, anchor=anchor, stroke_width=0)


def background(story):
    a = Art()
    for y in range(H):
        p = y/H
        a.line([(0, y), (W, y)], (int(34+117*p), int(172+44*p), int(220-18*p)), 2)
    # Distant rolling sand, sea flowers and hand-painted underwater silhouettes.
    for x, y, r in [(110, 94, 48), (790, 70, 44), (515, 135, 35)]:
        pts = []
        for j in range(181):
            q = j*math.tau/180
            rr = r*(.66+.28*math.cos(q*5))
            pts.append((x+math.cos(q)*rr, y+math.sin(q)*rr))
        a.line(pts, "#69d4db", 5)
        a.ellipse((x-6, y-6, x+6, y+6), "#69d4db")
    a.ellipse((-250, 365, 1250, 790), "#f6d995")
    a.ellipse((-100, 420, 1100, 740), "#ffe7ac")
    for i in range(95):
        x = (i*157+19) % W
        y = 407+(i*47) % 103
        a.ellipse((x, y, x+3, y+2), "#e4c17f")
    # SpongeBob's pineapple home and Squidward's distant stone house.
    a.ellipse((747, 204, 863, 371), "#f2a455", INK, 3)
    for j in range(5):
        a.line([(753, 235+j*25), (844, 330+j*12)], "#dc843c", 3)
        a.line([(855, 232+j*24), (758, 330+j*12)], "#dc843c", 3)
    for j in range(7):
        x = 806+(j-3)*9
        a.poly([(801, 218), (x-13, 154-abs(j-3)*6), (x+8, 190), (813, 221)], "#399b6f", INK)
    a.rect((785, 310, 825, 370), "#71a7c6", 18, INK, 3)
    a.ellipse((766, 250, 796, 280), "#aff5f4", INK, 4)
    a.ellipse((815, 260, 845, 290), "#aff5f4", INK, 4)
    a.ellipse((813, 339, 818, 344), INK)
    a.rect((76, 263, 145, 379), "#649eb8", 23, INK, 3)
    a.poly([(77, 300), (45, 315), (76, 328)], "#538ca9", INK)
    a.poly([(145, 300), (167, 317), (144, 328)], "#538ca9", INK)
    a.rect((90, 336, 126, 378), "#426b8e", 15, INK)
    a.rect((81, 284, 104, 304), "#a9e4e8", 4, INK)
    a.rect((115, 284, 138, 304), "#a9e4e8", 4, INK)
    a.poly([(108, 292), (99, 329), (121, 329)], "#55899e", INK)
    # Foreground coral gardens, kept below the action.
    for x, flip in [(25, 1), (925, -1), (692, 1)]:
        for j in range(4):
            a.line([(x, 414), (x+(j-1)*13*flip, 387-j*7), (x+(j-1)*17*flip, 367-j*6)],
                   "#bd7bd4", 9)
        a.ellipse((x-22, 406, x+29, 422), "#d8b598")
    a.rect((20, 16, 940, 63), "#eefdf4", 22)
    a.text("ГУБКА БОБ  ·  "+STORIES[story][1], W/2, 39, 24)
    return a.im


def bubble(a, x, y, r):
    if r < 2:
        return
    a.ellipse((x-r, y-r, x+r, y+r), None, "#dbfaff", 2.5)
    a.arc((x-r+4, y-r+4, x+r-4, y+r-4), 193, 264, "#ffffff", 3)
    a.arc((x-r+3, y-r+3, x+r-3, y+r-3), 20, 125, "#e3a9ee", 3)
    a.ellipse((x-r*.56, y-r*.67, x-r*.21, y-r*.45), "#ffffff")


def sponge(a, x, y, t, scale=1, mood="happy", hand=0, walk=0):
    """x,y is foot ground. Every limb and expression is keyed independently."""
    s = scale
    y += math.sin(t*7)*walk*4
    def pt(px, py): return (x+px*s, y+py*s)
    def box(l, u, r, b): return (*pt(l,u), *pt(r,b))
    def el(b,c,o=None,w=2): a.ellipse(box(*b),c,o,w*s)
    def re(b,c,rad=0,o=None,w=2): a.rect(box(*b),c,rad*s,o,w*s)
    def li(p,c=INK,w=3): a.line([pt(*v) for v in p],c,w*s)
    # Springy knees, striped socks and shiny black shoes.
    for j, lx in enumerate([-28, 28]):
        stride = math.sin(t*9+j*math.pi)*walk*11
        li([(lx,-63), (lx+stride*.5,-35), (lx+stride,-15)], "#f4d44a", 8)
        re((lx+stride-7,-31,lx+stride+7,-8),"#ffffff",3,INK)
        li([(lx+stride-7,-25),(lx+stride+7,-25)],"#e95e65",2)
        li([(lx+stride-7,-20),(lx+stride+7,-20)],"#59a6d7",2)
        el((lx+stride-12,-13,lx+stride+22,1),"#253d50",INK,2)
        el((lx+stride+4,-11,lx+stride+16,-8),"#6d8391")
    # Wavy sponge silhouette (not an undifferentiated yellow square).
    points=[(-58,-205),(-43,-211),(-24,-207),(-7,-212),(14,-207),(34,-212),(55,-206),
            (61,-188),(57,-167),(62,-148),(57,-127),(61,-106),(51,-91),
            (31,-94),(10,-90),(-10,-95),(-32,-91),(-58,-97),(-61,-119),(-57,-140),(-62,-164)]
    a.poly([pt(*p) for p in points],"#ffe45d",INK,3*s)
    for px,py,r in [(-46,-190,6),(41,-192,5),(-50,-149,5),(47,-137,7),(-38,-109,4),
                    (37,-113,4),(-2,-198,3),(1,-126,3)]:
        el((px-r,py-r,px+r,py+r),"#d3b934")
        a.arc(box(px-r,py-r,px+r,py+r),10,150,"#fff183",2*s)
    re((-59,-99,59,-79),"#fffdf0",3,INK,2)
    re((-59,-79,59,-53),"#a66a44",4,INK,3)
    for px in [-43,-13,20,45]: re((px,-75,px+15,-71),INK,1)
    a.poly([pt(-16,-98),pt(-3,-85),pt(0,-98)],"#ffffff",INK)
    a.poly([pt(16,-98),pt(3,-85),pt(0,-98)],"#ffffff",INK)
    a.poly([pt(0,-93),pt(-6,-86),pt(0,-67),pt(7,-86)],"#eb5452",INK)
    # White sleeves, noodly arms, fingers. Hand lifts the bubble wand.
    for j, direction in enumerate([-1,1]):
        hx=direction*(80+math.sin(t*2+j)*3)
        hy=-105-(hand*61 if j else math.sin(t*3)*walk*14)
        re((direction*63-10,-123,direction*63+10,-104),"#fffdf0",9,INK)
        li([(direction*65,-107),(direction*79,-92),(hx,hy)],"#e1ba3b",7)
        li([(direction*65,-107),(direction*79,-92),(hx,hy)],"#ffe45d",4)
        el((hx-7,hy-6,hx+7,hy+7),"#ffe45d",INK,2)
        for k in range(3):
            li([(hx+direction*3,hy+k*3-3),(hx+direction*(12+k*2),hy+k*5-7)],"#ffe45d",4)
    blink = abs((t+0.3)%4.2-3.6)<.07
    eyeH = 3 if blink else 30
    for j, ex in enumerate([-25,25]):
        el((ex-24,-173-eyeH,ex+24,-173+eyeH),"#ffffff",INK,2.5)
        if not blink:
            look=math.sin(t*.8)*2
            el((ex-11+look,-186,ex+14+look,-159),"#58bddf",INK,2)
            el((ex-6+look,-181,ex+10+look,-161),"#263953")
            el((ex-4+look,-181,ex+2+look,-174),"#ffffff")
            for k in range(3):
                li([(ex+(k-1)*13,-200),(ex+(k-1)*18,-212-(4 if k==1 else 0))],INK,2.5)
    # Cheeks, smile and two iconic teeth.
    el((-54,-151,-25,-132),"#f5a36a")
    el((27,-151,55,-132),"#f5a36a")
    for ex in [-45,-35,37,46]: el((ex-1.5,-143,ex+1.5,-140),"#bf6b53")
    if mood=="wow":
        el((-16,-137,17,-106),"#943e36",INK)
        el((-10,-115,12,-107),"#ee8c87")
    else:
        a.arc(box(-40,-163,42,-113),10,170,INK,3*s)
        if mood=="laugh":
            el((-23,-137,24,-111),"#943e36",INK)
            el((-11,-118,15,-109),"#ee8c87")
    for ex in [-12,3]: re((ex,-132,ex+13,-117),"#fffef7",1,INK,1.5)
    el((-9,-165,12,-140),"#ffe45d",INK,2)


def gary(a, x, y, t, s=1, excited=False):
    a.ellipse((x-57*s,y-23*s,x+70*s,y),"#7ac6d0",INK,3)
    a.ellipse((x-56*s,y-13*s,x+65*s,y+1*s),"#bbe3aa",INK,2)
    a.ellipse((x-46*s,y-82*s,x+35*s,y-10*s),"#ec948f",INK,3)
    spiral=[]
    for i in range(100):
        q=i*.13; r=29*(1-i/110)*s
        spiral.append((x-5*s+math.cos(q)*r,y-45*s+math.sin(q)*r))
    a.line(spiral,"#b95877",4)
    for j in range(2):
        ex=x+(42+j*21)*s
        ey=y-(78+math.sin(t*3+j)*4+(5 if excited else 0))*s
        a.line([(x+(38+j*16)*s,y-14*s),(ex,ey+10*s)],"#7ac6d0",7*s)
        a.ellipse((ex-12*s,ey-17*s,ex+12*s,ey+12*s),"#fff3c3",INK,2)
        a.ellipse((ex-5*s,ey-8*s,ex+7*s,ey+7*s),"#e46e74",INK)
        a.ellipse((ex-1*s,ey-5*s,ex+4*s,ey+4*s),INK)
    a.arc((x+35*s,y-22*s,x+66*s,y-5*s),0,160,INK,2)


def patrick(a,x,y,t,arm=0):
    bob=math.sin(t*3)*3
    pts=[(x,y-198+bob),(x+29,y-109+bob),(x+92,y-141-arm*20),
         (x+63,y-77),(x+51,y-24),(x+33,y),(x+8,y-6),
         (x-8,y-6),(x-33,y),(x-52,y-23),(x-62,y-77),
         (x-91,y-140-arm*20),(x-29,y-108+bob)]
    a.poly(pts,"#f5a29f",INK,3)
    a.ellipse((x-52,y-126,x+52,y-28),"#f5a29f")
    a.poly([(x-51,y-61),(x+51,y-61),(x+46,y-23),(x+8,y-18),
            (x,y-34),(x-8,y-18),(x-46,y-23)],"#b9d973",INK)
    for dx in [-30,21]:
        a.ellipse((x+dx-10,y-53,x+dx+10,y-36),"#a77ab9")
    for ex in [-14,14]:
        a.ellipse((x+ex-11,y-145+bob,x+ex+11,y-112+bob),"#fffdf0",INK)
        a.ellipse((x+ex-2,y-131+bob,x+ex+5,y-120+bob),INK)
    a.arc((x-24,y-123+bob,x+25,y-85+bob),5,170,INK,3)
    a.line([(x-18,y-154+bob),(x-7,y-157+bob)],INK,3)
    a.line([(x+7,y-157+bob),(x+18,y-154+bob)],INK,3)
    a.ellipse((x-2,y-78,x+3,y-73),"#c37185")


def burger(a,x,y,s=1,stack=1):
    # y is bottom; stack controls a comic towering sandwich.
    a.ellipse((x-67*s,y-13*s,x+67*s,y+8*s),"#d99244",INK,3)
    yy=y-14*s
    for i in range(stack):
        a.rect((x-65*s,yy-15*s,x+65*s,yy),"#744735",8*s,INK,2)
        a.poly([(x-69*s,yy-18*s),(x-43*s,yy-28*s),(x-15*s,yy-20*s),
                (x+10*s,yy-29*s),(x+42*s,yy-18*s),(x+69*s,yy-26*s),
                (x+67*s,yy-11*s),(x-68*s,yy-11*s)],"#6abb72",INK)
        a.rect((x-60*s,yy-35*s,x+60*s,yy-27*s),"#ed7165",3*s,INK)
        yy-=43*s
    a.ellipse((x-66*s,yy-47*s,x+66*s,yy+8*s),"#efbc64",INK,3)
    a.rect((x-65*s,yy-15*s,x+65*s,yy+2*s),"#efbc64")
    a.line([(x-65*s,yy+2*s),(x+65*s,yy+2*s)],INK,2)
    for dx,dy in [(-35,-25),(-15,-35),(7,-24),(30,-32),(45,-15)]:
        a.line([(x+dx*s,yy+dy*s),(x+(dx+4)*s,yy+(dy-2)*s)],"#fff4c5",3*s)


def jelly(a,x,y,t,s=1):
    for j in range(4):
        a.line([(x+(j-1.5)*12*s+math.sin(t*4+k*.7+j)*6*s,y+(15+k*7)*s)
                for k in range(8)],"#dd80bb",3*s)
    a.ellipse((x-34*s,y-29*s,x+34*s,y+20*s),"#efa1d4",INK,2)
    a.rect((x-32*s,y+2*s,x+32*s,y+17*s),"#efa1d4",5*s)
    for dx,dy in [(-16,-10),(12,-17),(20,1),(-6,5)]:
        a.ellipse((x+(dx-5)*s,y+(dy-4)*s,x+(dx+5)*s,y+(dy+4)*s),"#d271b4")


BACKS=[background(i) for i in range(3)]


def frame(story,t):
    a=Art(BACKS[story])
    for j in range(7):
        bubble(a,40+(j*137)%920,390-((t*15+j*61)%300),5+j%3*2)
    if story==0:
        approach=ease(t/3)
        popped=t>=13
        sponge(a,230+approach*70,419,t,1.35,"laugh" if popped else "happy",hand=ease((t-2)/2))
        # Wand follows the raised right hand.
        a.line([(410,282),(434,237)],"#f18c9e",5)
        a.ellipse((421,210,451,239),None,"#ee7799",5)
        gary(a,625+ease((t-8)/3)*45,420,t,1.25,popped)
        if 3<t<13:
            p=ease((t-3)/8)
            bx=447+150*p;by=218-43*math.sin(p*math.pi)
            bubble(a,bx,by,8+52*p)
            # A tiny snail-shaped bubble makes Gary follow it.
            if p>.7:
                a.arc((bx-20,by-13,bx+20,by+20),15,330,"#dcfaff",3)
        if 13<t<14.5:
            q=(t-13)/1.5
            for j in range(14):
                th=j*math.tau/14
                a.line([(597+math.cos(th)*(35+q*65),218+math.sin(th)*(35+q*65)),
                        (597+math.cos(th)*(47+q*80),218+math.sin(th)*(47+q*80))],"#ffffff",3)
        text="Гэри, смотри! Пузырь для тебя!" if t<7 else "Мяу? Поймаешь его?" if t<13 else "Поп! Ещё один?  — Мяу!"
    elif story==1:
        giant=6<t<14
        sponge(a,254,419,t,1.28,"wow" if giant else "laugh" if t>=14 else "happy",hand=.6 if giant else .1)
        patrick(a,699,422,t,arm=1 if t>=14 else .1)
        a.rect((405,369,565,386),"#bd8662",6,INK,3)
        a.line([(421,386),(418,430)],"#8a6659",12)
        a.line([(547,386),(552,430)],"#8a6659",12)
        if t<6:
            burger(a,485,366,.85,1)
            bubble(a,490,225,12+math.sin(t)*2)
        elif t<14:
            stack=min(4,1+int((t-6)/1.5))
            tilt=math.sin((t-6)*4)*ease((t-10)/3)*15
            burger(a,485+tilt,366,.85,stack)
            if t>11:
                a.text("ОГО!",486,112+math.sin(t*5)*5,35,"#fffcee")
        else:
            # The towering burger becomes two meals, one for each friend.
            p=ease((t-14)/1.5)
            burger(a,485-130*p,366-33*p,.65,1)
            burger(a,485+130*p,366-33*p,.65,1)
            for j in range(8):
                th=j*math.tau/8
                a.line([(485+math.cos(th)*45,254+math.sin(th)*45),
                        (485+math.cos(th)*60,254+math.sin(th)*60)],"#fffcee",3)
        text="Патрик, приготовим обед?" if t<6 else "Кажется, сыра хватит на всех!" if t<14 else "Лучший рецепт — поделиться с другом!"
    else:
        dance=ease((t-7)/2)
        sponge(a,330+math.sin(t*2)*dance*26,422-abs(math.sin(t*5))*dance*14,t,1.3,
               "laugh" if t>7 else "wow",hand=.5+.5*dance,walk=dance*.35)
        for j in range(4):
            x=545+math.sin(t*(.65+j*.1)+j)*95+j*34
            y=200+j*35+math.sin(t*2.4+j)*22
            jelly(a,x,y,t+j,1 if j<2 else .72)
        if t<7:
            # Net lowers; SpongeBob chooses to dance, not catch his new friends.
            a.line([(435,280),(465,186+t*8)],"#bf9a64",6)
            a.ellipse((449,150+t*8,499,194+t*8),None,INK,3)
            for j in range(3):
                a.line([(454,162+j*8+t*8),(494,162+j*8+t*8)],"#a0e3e4",2)
        if t>7:
            for j in range(5):
                x=431+j*55; y=129+math.sin(t*3+j)*12
                a.ellipse((x-7,y+8,x+6,y+16),"#fff8bd")
                a.line([(x+5,y+12),(x+5,y-13),(x+15,y-8)],"#fff8bd",3)
        text="Сегодня охота на медуз!" if t<7 else "А может… просто потанцуем?" if t<13 else "Подводная дискотека для всех друзей!"
    # Subtitles are part of the real video, visible on the 3D screen too.
    a.rect((45,466,915,521),"#f3fcf1",23)
    a.text(text,480,493,25)
    if t>STORIES[story][2]-2:
        a.ellipse((858,72,871,85),"#ef829f")
        a.ellipse((869,72,882,85),"#ef829f")
        a.poly([(859,80),(881,80),(870,95)],"#ef829f")
    return a.im.resize((W,H),Image.Resampling.LANCZOS)


def audio(path,story,duration):
    rate=44100
    samples=np.zeros(int(duration*rate),dtype=np.float64)
    notes=[60,64,67,72,67,64,62,65,69,74,69,65,60,67,72,76]
    for j in range(int(duration/.32)):
        start=j*.32
        n=notes[(j+story*3)%len(notes)]
        t=np.arange(int(.42*rate))/rate
        f=440*2**((n-69)/12)
        envelope=(1-np.exp(-t*100))*np.exp(-t*12)
        tone=(np.sin(math.tau*f*t)+.23*np.sin(math.tau*2*f*t))*envelope*.13
        k=int(start*rate); end=min(len(samples),k+len(tone))
        samples[k:end]+=tone[:end-k]
    cues=[[3.5,8,13],[6,8,10,12,14],[2,7,10,13,16]][story]
    for cue in cues:
        t=np.arange(int(.27*rate))/rate
        tone=np.sin(math.tau*(420*t+1100*t*t))*np.exp(-t*18)*.14
        k=int(cue*rate); end=min(len(samples),k+len(tone))
        samples[k:end]+=tone[:end-k]
    fade=np.minimum(1,np.minimum(np.arange(len(samples))/rate,
                                 (len(samples)-np.arange(len(samples)))/rate))
    with wave.open(str(path),"wb") as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes((np.clip(samples*fade,-1,1)*32767).astype("<i2").tobytes())


def main():
    p=argparse.ArgumentParser();p.add_argument("--stills",action="store_true")
    args=p.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    if args.stills:
        sheet=Image.new("RGB",(W*3,H*3))
        for i in range(3):
            for j,t in enumerate([3,10,15]):
                sheet.paste(frame(i,t),(j*W,i*H))
        sheet.resize((1440,810)).save("/tmp/chichi-cinema-storyboard.jpg")
        return
    for story,(name,title,duration) in enumerate(STORIES):
        with tempfile.TemporaryDirectory(prefix="chichi-cartoon-") as temp:
            sound=pathlib.Path(temp)/"music.wav";audio(sound,story,duration)
            cmd=["ffmpeg","-hide_banner","-loglevel","warning","-y",
                 "-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
                 "-i",str(sound),"-c:v","libx264","-preset","medium","-crf","23",
                 "-pix_fmt","yuv420p","-profile:v","main","-level","3.1",
                 "-c:a","aac","-b:a","64k","-movflags","+faststart","-shortest",str(OUT/(name+".mp4"))]
            proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
            for f in range(duration*FPS):
                proc.stdin.write(frame(story,f/FPS).tobytes())
            proc.stdin.close()
            if proc.wait(): raise RuntimeError("FFmpeg encoding failed")
            print(title, (OUT/(name+".mp4")).stat().st_size, "bytes",flush=True)


if __name__=="__main__":main()
