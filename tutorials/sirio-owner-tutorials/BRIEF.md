---
workflow: general-video
flow: automation
storyboard: yes
message: "Desde el celular, un propietario puede crear, publicar y compartir una carta digital sin depender de soporte."
destination: in-app-help
aspect: 1080x1920
language: es-PE
audience: "Propietarios de restaurantes que usan Sirio por primera vez, principalmente desde un teléfono."
length: 45-60s por tutorial
angle: guided-mobile-onboarding
voice: Zephyr
style_preset: sirio-mobile-guide
---

## Intent

Serie de cinco tutoriales verticales y claros para acompañar a nuevos propietarios
desde su primer acceso hasta compartir su código QR. Cada video debe mostrar una
interfaz simulada de Sirio, con datos de marca genéricos, toques visibles y texto
legible en una pantalla móvil. La narración será cálida, pausada y directa en
español peruano.

## Assets

- ../../apps/web/public/brand/sirio-logo.webp — logo oficial de Sirio para aperturas y cierres.
- Interfaz simulada de Sirio — no se emplearán cuentas, URLs ni restaurantes reales.

## Customizations

- Cinco entregas verticales de 45 a 60 segundos: acceso, perfil, digitalización,
  revisión/publicación y QR.
- Voz Gemini TTS Zephyr usando la variable local GEMINI_API_KEY; ninguna clave ni
  dato real aparecerá en una composición, subtítulo, video o página web.
- Subtítulos visibles dentro del video y archivo WebVTT equivalente para el panel.

## Notes

- Prioridad absoluta: comprensión y legibilidad en móviles.
- Sin música de fondo ni efectos de sonido: la voz y la lectura visual son el foco.
- El storyboard requiere aprobación antes de escribir el guion definitivo, generar
  audio o renderizar cualquier MP4.
