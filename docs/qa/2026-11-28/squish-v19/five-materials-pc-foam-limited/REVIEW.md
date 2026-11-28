# Five material pressure matrix — baseline works, Foam needs correction

Source f06208f. Actual desktop original runtime pointer input, rest/press/held/
recovery for five existing material models, exact cameras and native render.
All20 captured frames are PRESSURE tests, not the final20 semantic reference
states or original-cat full-cycle videos. The harness basic assertions PASS.

Review: jelly/slime/butter/cloud have positive tets, no faults or limiting steps.
Jelly volume ratio0.99605, slime0.99743, butter0.99460, cloud0.98839.
Foam has81 bounded inversion-limiter activations and min tet0.0800076. Its fine
actual paw imprint is visible, but repeated volume blocking is a MAJOR defect,
so this is NOT final accepted physics. Correct mounted-cell compression cap and
make fine imprint apply only the residual beyond coarse compression (one pressure,
not duplicated displacements), preserve desired contact depth for fine resolution.
