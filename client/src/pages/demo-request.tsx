import { useEffect } from "react";
import { useLocation } from "wouter";

export default function DemoRequestPage() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/generator"); }, []);
  return null;
}
