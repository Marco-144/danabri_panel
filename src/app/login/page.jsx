"use client";

import { useState } from "react";
import { login } from "@/services/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [hasError, setHasError] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    const res = await login(nombre, password);

    if (res.token) {
      setHasError(false);
      localStorage.setItem("token", res.token);
      router.push("/dashboard");
    } else {
      setHasError(true);
      alert(res.error);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div
        className={`${styles.loginCard} ${hasError ? styles.loginError : ""}`}
      >
        <div className={styles.logoWrapper}>
          <Image
            src="/DanabriLogoRecortado.png"
            alt="Company Logo"
            className={styles.loginLogo}
            width={300}
            height={100}
            priority
          />
        </div>

        <form onSubmit={handleLogin}>
          <div className={styles.fieldGroup}>
            <label htmlFor="user" className={styles.formLabel}>
              Usuario
            </label>
            <input
              id="user"
              type="text"
              className={styles.formControl}
              placeholder="Ej. Adrian_Serrano"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setHasError(false);
              }}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={styles.formControl}
              placeholder="Ej. adrian834"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setHasError(false);
              }}
              required
            />
          </div>

          <button type="submit" className={styles.btnPrimary}>
            Entrar
          </button>
        </form>

        <p className={styles.footerText}>
          © 2026 DANABRI. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
