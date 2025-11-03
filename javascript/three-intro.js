// Three.js Intro Animation with Parallax Depth for Avirup's Website
// Save this as: javascript/three-intro.js

(function() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        canvas.offsetWidth / canvas.offsetHeight,
        0.1,
        1000
    );
    
    const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true, 
        alpha: false 
    });
    
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x252833);
    
    camera.position.z = 50;

    // Create multiple particle layers for parallax depth
    const particleLayers = [];
    const layerCount = 4;
    
    for (let layer = 0; layer < layerCount; layer++) {
        const particleCount = 400 - (layer * 50);
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const originalPositions = new Float32Array(particleCount * 3);
        
        // Depth factor: closer layers (0) move more, farther layers (3) move less
        const depthFactor = 1 - (layer * 0.2);
        const depthOffset = layer * 15; // Z-axis separation
        const spreadMultiplier = 1 + (layer * 0.3);
        
        // Initialize particles
        for (let i = 0; i < particleCount * 3; i += 3) {
            const radius = 15 + Math.random() * 35 * spreadMultiplier;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i] = radius * Math.sin(phi) * Math.cos(theta) * 1.5;
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi) - depthOffset;
            
            originalPositions[i] = positions[i];
            originalPositions[i + 1] = positions[i + 1];
            originalPositions[i + 2] = positions[i + 2];
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.02 * depthFactor,
                y: (Math.random() - 0.5) * 0.02 * depthFactor,
                z: (Math.random() - 0.5) * 0.02 * depthFactor
            });
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Vary color and opacity by depth
        const layerColors = [0xff6b9d, 0xff8ab3, 0xffa9c9, 0xc084a3];
        const particleMaterial = new THREE.PointsMaterial({
            color: layerColors[layer],
            size: 0.8 + (layer * 0.2),
            transparent: true,
            opacity: 0.8 - (layer * 0.15),
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        particleSystem.userData = {
            velocities,
            originalPositions,
            depthFactor,
            layer
        };
        
        scene.add(particleSystem);
        particleLayers.push(particleSystem);
    }

    // Add ambient lighting geometries at different depths
    const ambientMeshes = [];
    for (let i = 0; i < 3; i++) {
        const ambientGeo = new THREE.IcosahedronGeometry(15 + i * 5, 1);
        const ambientMat = new THREE.MeshBasicMaterial({
            color: 0xff6b9d,
            wireframe: true,
            transparent: true,
            opacity: 0.08 - (i * 0.02)
        });
        const ambientMesh = new THREE.Mesh(ambientGeo, ambientMat);
        ambientMesh.position.z = -i * 10;
        ambientMesh.userData.depthFactor = 1 - (i * 0.25);
        scene.add(ambientMesh);
        ambientMeshes.push(ambientMesh);
    }

    // Animation variables
    let time = 0;
    let mouseX = 0;
    let mouseY = 0;
    const mouse = { x: 0, y: 0 };
    let scrollY = 0;

    // Mouse interaction for parallax
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Scroll tracking for parallax
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;

        // Smooth mouse follow
        mouse.x += (mouseX - mouse.x) * 0.05;
        mouse.y += (mouseY - mouse.y) * 0.05;

        // Scroll factor for parallax
        const scrollFactor = scrollY * 0.001;

        // Parallax camera movement
        camera.position.x = mouse.x * 3;
        camera.position.y = mouse.y * 3;
        camera.lookAt(0, 0, 0);

        // Animate each particle layer with parallax
        particleLayers.forEach((particleSystem) => {
            const { velocities, originalPositions, depthFactor, layer } = particleSystem.userData;
            const particleCount = velocities.length;
            
            // Rotate with depth-based parallax
            particleSystem.rotation.y = time * 0.15 * depthFactor + mouse.x * 0.5 * depthFactor;
            particleSystem.rotation.x = Math.sin(time * 0.3) * 0.2 * depthFactor + mouse.y * 0.3 * depthFactor;
            
            // Scroll-based vertical movement
            particleSystem.position.y = -scrollFactor * 5 * depthFactor;
            particleSystem.position.x = scrollFactor * 2 * depthFactor;

            // Update particle positions with wave motion
            const positions = particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Wave motion scaled by depth
                const wave = Math.sin(time + i * 0.1) * 0.5 * depthFactor;
                positions[i3] = originalPositions[i3] + Math.sin(time + i * 0.05) * 2 * depthFactor + wave;
                positions[i3 + 1] = originalPositions[i3 + 1] + Math.cos(time + i * 0.05) * 2 * depthFactor + wave;
                positions[i3 + 2] = originalPositions[i3 + 2] + Math.sin(time * 0.5 + i * 0.05) * 2 * depthFactor;
                
                // Gentle drift
                positions[i3] += velocities[i].x;
                positions[i3 + 1] += velocities[i].y;
                positions[i3 + 2] += velocities[i].z;
                
                // Boundary check
                const dist = Math.sqrt(
                    positions[i3] * positions[i3] + 
                    positions[i3 + 1] * positions[i3 + 1] + 
                    positions[i3 + 2] * positions[i3 + 2]
                );
                
                if (dist > 80 + layer * 20) {
                    positions[i3] = originalPositions[i3];
                    positions[i3 + 1] = originalPositions[i3 + 1];
                    positions[i3 + 2] = originalPositions[i3 + 2];
                }
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
        });

        // Animate ambient meshes with parallax
        ambientMeshes.forEach((mesh) => {
            const depthFactor = mesh.userData.depthFactor;
            
            mesh.rotation.y = time * 0.1 * depthFactor + mouse.x * 0.2 * depthFactor;
            mesh.rotation.x = time * 0.15 * depthFactor + mouse.y * 0.2 * depthFactor;
            
            // Scroll parallax
            mesh.position.y = -scrollFactor * 3 * depthFactor;
        });

        renderer.render(scene, camera);
    }

    // Handle window resize
    function onWindowResize() {
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();
})();