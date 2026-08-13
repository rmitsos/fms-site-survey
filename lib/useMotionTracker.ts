"use client";

import { useCallback, useRef, useState } from "react";

export type MotionEstimate = { distanceMeters: number; headingDegrees: number | null };

type MotionPermissionEvent = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

/** Dead-reckons distance walked from DeviceMotion's linear acceleration (gravity already
 * removed): a noise floor ignores sensor jitter while stationary, acceleration integrates to
 * velocity, velocity integrates to distance, and velocity decays 10%/tick so it settles back
 * toward zero between deliberate stops instead of drifting away unbounded. DeviceOrientation
 * supplies a compass heading alongside it when available. This is a rough indoor estimate, not
 * inertial navigation - every waypoint still gets a manual correction. */
export function useMotionTracker() {
  const [tracking, setTracking] = useState(false);
  const [estimate, setEstimate] = useState<MotionEstimate>({ distanceMeters: 0, headingDegrees: null });
  const [error, setError] = useState<string | null>(null);

  const velocity = useRef(0);
  const distance = useRef(0);
  const heading = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const onMotion = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const onOrientation = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      setError("This device does not report motion.");
      return false;
    }

    const motionEvent = DeviceMotionEvent as MotionPermissionEvent;
    if (typeof motionEvent.requestPermission === "function") {
      try {
        const permission = await motionEvent.requestPermission();
        if (permission !== "granted") {
          setError("Motion sensor permission was denied.");
          return false;
        }
      } catch {
        setError("Could not request motion sensor permission.");
        return false;
      }
    }

    velocity.current = 0;
    distance.current = 0;
    lastTimestamp.current = null;

    const NOISE_FLOOR_MS2 = 0.15;
    const VELOCITY_DECAY = 0.9;

    const handleMotion = (e: DeviceMotionEvent) => {
      const now = e.timeStamp;
      if (lastTimestamp.current === null) {
        lastTimestamp.current = now;
        return;
      }
      const dt = (now - lastTimestamp.current) / 1000;
      lastTimestamp.current = now;
      const accel = e.acceleration;
      if (!accel || dt <= 0 || dt > 0.5) return;

      const magnitude = Math.sqrt((accel.x ?? 0) ** 2 + (accel.y ?? 0) ** 2 + (accel.z ?? 0) ** 2);
      const a = magnitude > NOISE_FLOOR_MS2 ? magnitude : 0;
      velocity.current = velocity.current * VELOCITY_DECAY + a * dt;
      distance.current += velocity.current * dt;
      setEstimate({ distanceMeters: distance.current, headingDegrees: heading.current });
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha != null) heading.current = (360 - e.alpha) % 360;
    };

    onMotion.current = handleMotion;
    onOrientation.current = handleOrientation;
    window.addEventListener("devicemotion", handleMotion);
    window.addEventListener("deviceorientation", handleOrientation);
    setTracking(true);
    return true;
  }, []);

  const stop = useCallback(() => {
    if (onMotion.current) window.removeEventListener("devicemotion", onMotion.current);
    if (onOrientation.current) window.removeEventListener("deviceorientation", onOrientation.current);
    onMotion.current = null;
    onOrientation.current = null;
    setTracking(false);
  }, []);

  const reset = useCallback(() => {
    velocity.current = 0;
    distance.current = 0;
    setEstimate({ distanceMeters: 0, headingDegrees: heading.current });
  }, []);

  return { tracking, estimate, error, start, stop, reset };
}
