import * as THREE from "three";
import { bowlPortions, BOWL_CAPACITY } from "./care-system.js";
export function createBowlModel() {
  const group = new THREE.Group();
  group.name = "Общая миска котиков";
  group.userData.id = "picnic";
  const profile = [
    [0, 0],
    [0.7, 0],
    [0.84, 0.12],
    [0.9, 0.38],
    [0.84, 0.42],
    [0.78, 0.36],
    [0.71, 0.12],
    [0, 0.12],
  ].map((p) => new THREE.Vector2(...p));
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 32),
    new THREE.MeshStandardMaterial({
      color: 0x89bbbc,
      roughness: 0.32,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
  );
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  group.add(bowl);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.035, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xebd8ac, roughness: 0.5 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.39;
  group.add(rim);
  const food = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.065, 8, 5),
      new THREE.MeshStandardMaterial({ color: 0xc9a96e, roughness: 0.9 }),
      80,
    ),
    dummy = new THREE.Object3D();
  for (let i = 0; i < 80; i++) {
    const a = i * 2.399,
      r = Math.sqrt((i + 0.5) / 80) * 0.65;
    dummy.position.set(
      Math.cos(a) * r,
      0.18 + (i % 3) * 0.025,
      Math.sin(a) * r,
    );
    dummy.scale.set(1, 0.65, 1);
    dummy.updateMatrix();
    food.setMatrixAt(i, dummy.matrix);
  }
  food.name = "Farm-grown food";
  food.count = 0;
  group.add(food);
  group.userData.food = food;
  group.userData.updateFood = (game) => {
    food.count = Math.round(
      Math.min(1, bowlPortions(game) / BOWL_CAPACITY) * 80,
    );
  };
  return group;
}
