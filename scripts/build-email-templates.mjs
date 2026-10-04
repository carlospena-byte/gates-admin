// Generates supabase/templates/*.html (Supabase Auth email templates) from the
// shared layout in supabase/functions/_shared/email.ts.
// Run: npm run build:emails   (Node >= 22.18 strips the TS types natively)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderEmail } from "../supabase/functions/_shared/email.ts";

const p = (t) => `<p style="margin:0 0 12px;">${t}</p>`;
const expires = p("Este código vence pronto y solo puede usarse una vez. Nunca lo compartas con nadie.");

const templates = {
  // signInWithOtp() for an existing user (magic_link) or a brand-new one
  // (confirmation) — both must show the 6-digit code, the app calls verifyOtp().
  "magic_link.html": {
    preheader: "Tu código para entrar a Vecinoo.",
    title: "Tu código de acceso",
    intro: p("Usa este código para entrar a tu cuenta de Vecinoo."),
    codeLabel: "Código de acceso",
    code: "{{ .Token }}",
    outro: expires + p("Si no intentaste iniciar sesión, ignora este correo."),
  },
  "confirmation.html": {
    preheader: "Tu código para empezar en Vecinoo.",
    title: "Te damos la bienvenida",
    intro: p("Ingresa este código en la app para verificar tu correo y terminar de crear tu cuenta."),
    codeLabel: "Código de verificación",
    code: "{{ .Token }}",
    outro: expires,
  },
  "email_change.html": {
    preheader: "Confirma tu nuevo correo en Vecinoo.",
    title: "Confirma tu nuevo correo",
    intro: p("Ingresa este código en la app para cambiar tu correo a <strong style=\"color:#252d29;\">{{ .NewEmail }}</strong>."),
    codeLabel: "Código de confirmación",
    code: "{{ .Token }}",
    outro: expires + p("Si no pediste este cambio, ignora este correo y tu cuenta seguirá igual."),
  },
};

for (const [file, content] of Object.entries(templates)) {
  writeFileSync(fileURLToPath(new URL(`../supabase/templates/${file}`, import.meta.url)), renderEmail(content));
  console.log("wrote supabase/templates/" + file);
}
