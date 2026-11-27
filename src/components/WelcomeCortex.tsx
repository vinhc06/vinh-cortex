"use client";

import { useEffect, useRef } from "react";
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group,
  Mesh, MeshBasicMaterial, PerspectiveCamera, Points, PointsMaterial, Scene,
  TorusGeometry, WebGLRenderer,
} from "three";
import { cloudPositions } from "@/lib/cortex-topology";

export default function WelcomeCortex({ onStatus }: { onStatus: (ready: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      onStatus(false);
      return;
    }

    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 80);
    const group = new Group();
    scene.add(group);
    const geometry = new BufferGeometry();
    const coordinates = cloudPositions("cortex");
    const colors = new Float32Array(coordinates.length);
    const soft = new Color("#297f9d");
    const bright = new Color("#91eaff");
    for (let index = 0; index < coordinates.length; index += 3) {
      const color = index % 21 === 0 ? bright : soft;
      colors.set([color.r, color.g, color.b], index);
    }
    geometry.setAttribute("position", new BufferAttribute(coordinates, 3));
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    const material = new PointsMaterial({ size: 0.06, vertexColors: true, opacity: 0.69, transparent: true, depthWrite: false, blending: AdditiveBlending });
    group.add(new Points(geometry, material));

    const orbitGeometry = new TorusGeometry(5.85, 0.016, 3, 112);
    const orbitMaterial = new MeshBasicMaterial({ color: "#67e8f9", wireframe: true, opacity: 0.22, transparent: true, depthWrite: false });
    const orbit = new Mesh(orbitGeometry, orbitMaterial);
    orbit.rotation.set(0.68, 0.28, -0.32);
    scene.add(orbit);
    group.rotation.set(0.10, -0.36, -0.14);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    element.appendChild(renderer.domElement);

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    function animate(time: number) {
      const dt = previous ? Math.min((time - previous) / 1000, 0.04) : 0;
      previous = time;
      group.rotation.y += dt * 0.13;
      orbit.rotation.z += dt * 0.095;
      orbit.rotation.y += dt * 0.055;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }
    function syncAnimation() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(animate);
    }
    function resize() {
      if (!element) return;
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.position.z = Math.max(18, 15 / camera.aspect);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.render(scene, camera);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    syncAnimation();
    onStatus(true);
    document.addEventListener("visibilitychange", syncAnimation);
    reduced.addEventListener("change", syncAnimation);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      reduced.removeEventListener("change", syncAnimation);
      geometry.dispose();
      material.dispose();
      orbitGeometry.dispose();
      orbitMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [onStatus]);

  return <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-75" />;
}
