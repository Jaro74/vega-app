# VEGA — Ejercicio Formal de Ponderación del Art. 14.5.b RGPD (Segmento B) v1

**Estado:** Ejercicio de ponderación documentado (2026-10-12), conforme a la exigencia de WP260
rev.01 §64 ("this assessment should be documented by the data controller in accordance with its
accountability obligations"). Complementa `VEGA_Revision_Art14_3c_14_5b_Segmento_B_v1.md`.

**Naturaleza:** Documento específico y breve — no reabre el LIA del Segmento B
(`VEGA_LIA_Segmento_B_v1.md`, finalidad/necesidad/ponderación del art. 6.1.f, ya cerrado). Es la
ponderación distinta y propia que exige el art. 14.5.b (esfuerzo del responsable frente a impacto
en el interesado de no ser informado individualmente) — no el test de interés legítimo del art.
6.1.f.

---

## 1. Esfuerzo requerido para informar individualmente

Informar individualmente a la segunda persona de cada sinastría exigiría, como mínimo: (a)
recopilar de ella —o del usuario, en su nombre— un dato de contacto directo (email, teléfono o
dirección) que hoy Vega no solicita ni necesita para prestar el servicio; (b) verificar que ese
dato de contacto corresponde realmente a la persona cuyos datos de nacimiento se introdujeron,
sin disponer de ningún medio propio de verificación de identidad de un tercero que nunca interactúa
con el producto; (c) hacerlo antes de la primera comunicación a Supabase/Railway/OpenAI
(art. 14.3.c), es decir, prácticamente en el mismo instante en que el usuario introduce los datos,
sin margen operativo razonable para una verificación previa.

## 2. Por qué ese esfuerzo es desproporcionado

- El esfuerzo no es solo operativo, sino estructural: exigiría rediseñar el producto para recoger
  un dato (contacto directo de la segunda persona) que hoy es deliberadamente innecesario para la
  finalidad del tratamiento (calcular la sinastría), únicamente para poder cumplir una obligación
  de información que no existiría si ese dato nunca se hubiera recogido.
- El volumen y la imprevisibilidad son análogos, en su estructura, al ejemplo del hospital (WP260
  rev.01, §548): cada sinastría puede implicar a una persona distinta, sin ningún patrón que
  permita anticipar o agrupar las notificaciones.
- El vínculo causal exigido por WP260 §62 se cumple: la dificultad surge directamente de que los
  datos de la segunda persona se obtienen a través del usuario, no de ella misma — no de una
  carencia operativa ajena a esa estructura.

## 3. Impacto potencial para la segunda persona si no se le informa individualmente

- Impacto limitado por el propio diseño: no existen identificadores directos de ella en ningún
  proveedor; el dato en bruto se borra en un plazo máximo de ~2 horas; el derivado no es
  reutilizable transcurridas 24 horas; no se genera ningún perfil comercial propio sobre ella; no
  hay decisiones automatizadas con efectos sobre ella (ya descartado en `VEGA_LIA_Segmento_B_v1.md`
  bloque 7, no se reabre).
- El impacto residual es, principalmente, el desconocimiento de que su sinastría fue calculada —
  mitigado por la existencia de un canal público permanente (sección 7) a través del cual puede
  llegar a saberlo y ejercer sus derechos si lo sospecha o lo descubre por otra vía.

## 4. Salvaguardas existentes

- Ausencia de nombre, email, teléfono o cualquier identificador directo de la segunda persona en
  cualquiera de los proveedores.
- Declaración del usuario, implementada en `PartnerStep.tsx`, de que dispone de los datos de forma
  legítima (mitigación de riesgo, no base jurídica ni sustituto del art. 14 — ya cerrado, no se
  reabre).
- Canal público permanente (`/datos-de-terceros`) como punto de entrada para el ejercicio de
  derechos (sección 7).

## 5. Minimización

El núcleo de datos de la segunda persona se limita a fecha de nacimiento, hora (si se conoce),
lugar/coordenadas (redondeadas a 2 decimales) y zona horaria — ya evaluado y cerrado en
`VEGA_Base_Juridica_Segmento_B_v1.md`, no se reabre aquí. No se recoge, en ningún caso, nombre,
email, teléfono ni dirección.

## 6. Retenciones

Dato en bruto: borrado inmediato, máximo técnico ~2 horas reales. Resultado derivado: vigencia de
24 horas, sin reutilización posterior, con eliminación física en el siguiente ciclo horario de
purga. Ya implementado y verificado en producción — no se reabre aquí (`VEGA_Base_Juridica_Segmento_B_v1.md`).

## 7. No recopilación de identificadores adicionales únicamente para notificar

Conforme al art. 11.1 RGPD, citado expresamente por WP260 rev.01 en el contexto del art. 14.5.b
(§64): un responsable no está obligado a recopilar, obtener o tratar información adicional para
identificar al interesado con el único fin de cumplir el RGPD, cuando la finalidad del tratamiento
no lo requiere. Vega no recopila el email/teléfono/dirección de la segunda persona únicamente para
poder notificarle — hacerlo sería contrario a la minimización ya aplicada y no está exigido por el
art. 14.5.b, que prevé precisamente la publicación general como alternativa a la notificación
individual.

## 8. Publicación permanente de `/datos-de-terceros`

La medida que el art. 14.5.b exige siempre adoptar — hacer pública la información — se satisface
mediante la página pública permanente `/datos-de-terceros`, enlazada desde la Privacy Policy y el
footer, ya implementada (2026-10-08). Al ser una página de disponibilidad continua, no vinculada a
cada acto puntual de comunicación a Supabase/Railway/OpenAI, satisface estructuralmente la
exigencia temporal del art. 14.3.c para los casos en que se invoca esta excepción (ver
`VEGA_Revision_Art14_3c_14_5b_Segmento_B_v1.md`, sección 2).

## 9. Derechos y canal cuando exista la sociedad

El contenido mínimo que esa página debe incluir (identidad del responsable, canal de privacidad
real, destinatarios confirmados: Supabase, Railway, OpenAI) queda pendiente de la constitución de
la sociedad, conforme a lo ya acordado en `VEGA_Responsable_Tratamiento_Sociedad_v1.md` y reflejado
en `VEGA_Checklist_Puesta_Marcha_Legal_Post_Sociedad_v1.md`. Esta ponderación no se da por cerrada
operativamente mientras ese contenido no esté publicado con datos reales — es una condición
adicional, distinta de la licitud de fondo del uso del art. 14.5.b, que esta ponderación sí
resuelve.

## 10. Conclusión de la ponderación

El esfuerzo que supondría notificar individualmente a cada segunda persona del Segmento B —
recopilar un dato de contacto hoy innecesario, verificarlo sin medios propios, y hacerlo en el
instante mismo de la recogida— es desproporcionado frente al impacto residual sobre ella, dado el
conjunto de salvaguardas ya implementadas (minimización, retención mínima, ausencia de
identificadores directos, ausencia de decisiones automatizadas) y la existencia de un canal público
permanente para el ejercicio de sus derechos. **La ponderación exigida por el art. 14.5.b se
documenta aquí como favorable al uso de esta excepción**, condicionado a que `/datos-de-terceros`
se actualice con los datos reales de la sociedad y el canal real antes de abrir tráfico real
(sección 9), conforme a lo ya exigido en `VEGA_Checklist_Puesta_Marcha_Legal_Post_Sociedad_v1.md`.
