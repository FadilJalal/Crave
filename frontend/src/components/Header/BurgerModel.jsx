import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
// Triggering re-analysis
import bunTex from '../../assets/bun_tex.png';
import meatTex from '../../assets/meat_tex.png';

const Realistic3DBurger = () => {
    const group = useRef();
    
    // Load photorealistic textures
    const bunTexture = useLoader(THREE.TextureLoader, bunTex);
    const meatTexture = useLoader(THREE.TextureLoader, meatTex);
    
    // Configure textures
    [bunTexture, meatTexture].forEach(tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1.5, 1.5);
    });

    const tomatoColor = "#e53935"; 
    const onionColor = "#f5f5f5"; 
    const pickleColor = "#4a7c44"; 
    const cheeseColor = "#ffb300"; 
    const brandOrange = "#FF3008";

    // Continuous 360 rotation
    useFrame((state, delta) => {
        if (group.current) {
            group.current.rotation.y += delta * 0.45;
        }
    });

    return (
        <>
            <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
                <group ref={group} scale={0.9}>
                    {/* Top Bun - Textured */}
                    <mesh position={[0, 1.6, 0]}>
                        <cylinderGeometry args={[1.2, 1.2, 0.45, 64]} />
                        <meshStandardMaterial map={bunTexture} roughness={0.5} />
                    </mesh>

                    {/* Onion Rings - Multi-layered */}
                    <group position={[0, 1.15, 0]}>
                        {[1, 0.8, 0.6].map((rad, i) => (
                            <mesh key={i} rotation={[Math.PI / 2, 0.1 * i, 0]} position={[0, i * 0.02, 0]}>
                                <torusGeometry args={[rad, 0.03, 16, 64]} />
                                <meshStandardMaterial color={onionColor} transparent opacity={0.7} />
                            </mesh>
                        ))}
                    </group>

                    {/* Tomato Slices - Slightly Translucent Red */}
                    <group position={[0, 0.75, 0]}>
                        <mesh position={[-0.35, 0, 0.2]}>
                            <cylinderGeometry args={[0.55, 0.55, 0.08, 32]} />
                            <meshStandardMaterial color={tomatoColor} roughness={0.6} />
                        </mesh>
                        <mesh position={[0.45, 0, -0.15]}>
                            <cylinderGeometry args={[0.55, 0.55, 0.08, 32]} />
                            <meshStandardMaterial color={tomatoColor} roughness={0.6} />
                        </mesh>
                    </group>

                    {/* Lettuce - Realistic Ruffled Edge (Torus Variation) */}
                    <mesh position={[0, 0.4, 0]}>
                        <torusGeometry args={[1.15, 0.07, 16, 120]} rotation={[Math.PI / 2, 0, 0]} />
                        <meshStandardMaterial color="#689f38" emissive="#33691e" emissiveIntensity={0.2} transparent opacity={0.9} />
                    </mesh>

                    {/* Beef Patty - Textured Photoreal */}
                    <mesh position={[0, 0, 0]}>
                        <cylinderGeometry args={[1.1, 1.1, 0.5, 32]} />
                        <meshStandardMaterial map={meatTexture} roughness={0.8} />
                    </mesh>

                    {/* Melting Cheese - Golden & Translucent */}
                    <mesh position={[0, -0.45, 0]} rotation={[0.05, Math.PI / 4, 0]}>
                        <boxGeometry args={[2, 0.05, 2]} />
                        <meshStandardMaterial color={cheeseColor} emissive={cheeseColor} emissiveIntensity={0.4} roughness={0.3} transparent opacity={0.95} />
                    </mesh>

                    {/* Pickles - Dark Green Round Disks */}
                    <group position={[0, -0.85, 0]}>
                        {[0.4, -0.4, 0].map((x, i) => (
                            <mesh key={i} position={[x, 0, (i-1)*0.3]}>
                                <cylinderGeometry args={[0.28, 0.28, 0.06, 16]} />
                                <meshStandardMaterial color={pickleColor} roughness={0.7} />
                            </mesh>
                        ))}
                    </group>

                    {/* Bottom Bun - Textured */}
                    <mesh position={[0, -1.3, 0]}>
                        <cylinderGeometry args={[1.2, 1.2, 0.25, 64]} />
                        <meshStandardMaterial map={bunTexture} roughness={0.6} />
                    </mesh>

                    {/* Subtle Brand Flavor Accents */}
                    <mesh position={[0, 0, 0]}>
                        <torusGeometry args={[2.5, 0.01, 8, 100]} rotation={[Math.PI / 2, 0, 0]} />
                        <meshStandardMaterial color={brandOrange} transparent opacity={0.2} />
                    </mesh>
                </group>
            </Float>

            <ContactShadows 
                position={[0, -2.5, 0]} 
                opacity={0.35} 
                scale={10} 
                blur={3} 
                far={4.5} 
            />
        </>
    );
};

export default Realistic3DBurger;
