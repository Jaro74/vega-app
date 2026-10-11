# VEGA — Revisión Jurídica Interna: Art. 14.3.c y Art. 14.5.b RGPD en el Segmento B v1

**Estado:** Revisión jurídica interna cerrada (2026-10-12). Conclusión: **CERRABLE
INTERNAMENTE**, con una condición documental pendiente antes del GO: redactar y archivar el
ejercicio formal de ponderación del art. 14.5.b (`VEGA_Ponderacion_Art14_5b_Segmento_B_v1.md`).

**Naturaleza:** Análisis preparatorio, no vinculante, basado en fuentes oficiales (RGPD/EUR-Lex,
WP29/EDPB). Distingue **[HECHO]** / **[NORMA/CRITERIO OFICIAL]** (con cita) / **[INTERPRETACIÓN]**
(no vinculante). Complementa, sin sustituir, `VEGA_Analisis_Art14_Segmento_B_v1.md` — resuelve
específicamente dos puntos que ese documento dejaba abiertos (destinatarios del art. 14.3.c;
confianza del art. 14.5.b), gracias a una fuente primaria (WP260 rev.01) que en aquel momento no
pudo leerse en texto íntegro.

**Alcance:** no reabre el LIA del Segmento B (finalidad/necesidad/ponderación del art. 6.1.f, ya
cerrado), la base 6.1.f en sí, las retenciones ya implementadas, `free_text`, ni Railway/`vega-api`
como auditoría de código. No modifica código ni páginas públicas — todas las implicaciones quedan
señaladas como pendientes.

---

## 1. Hechos jurídicos respaldados por fuentes oficiales

1. **Art. 14.3 RGPD**: tres supuestos de plazo — (a) dentro de un plazo razonable, máximo un mes
   desde la obtención; (b) si los datos se usan para comunicarse con el interesado, a más tardar en
   la primera comunicación; (c) si se prevé la comunicación a otro destinatario, a más tardar en el
   momento en que los datos se comuniquen por primera vez a ese destinatario.
2. **Art. 4.9 RGPD**: "destinatario" es "la persona física o jurídica, autoridad pública, servicio
   u otro organismo al que se comuniquen datos personales, se trate o no de un tercero."
3. **WP260 rev.01 (Article 29 Working Party / EDPB, *Guidelines on transparency under Regulation
   2016/679*, adoptadas 29-11-2017, revisadas 11-4-2018, endosadas por el EDPB), §319 y nota 33**
   (verificado en texto íntegro):
   > *"The general one-month time limit in Article 14.3(a) can also be curtailed under Article
   > 14.3(c) which provides for a situation where the data are being disclosed to another
   > recipient (whether a third party or not). In such a case, the information must be provided at
   > the latest at the time of the first disclosure."*
   >
   > Nota 33: *"Article 4.9 defines 'recipient' and clarifies that a recipient to whom personal
   > data are disclosed does not have to be a third party. Therefore, a recipient may be a data
   > controller, joint controller or processor."*
4. **WP260 rev.01, §608** (verificado en texto íntegro):
   > *"The term 'recipient' is defined in Article 4.9 as 'a natural or legal person, public
   > authority, agency or another body, to which the personal data are disclosed, whether a third
   > party or not'. As such, a recipient does not have to be a third party. Therefore, other data
   > controllers, joint controllers and processors to whom data is transferred or disclosed are
   > covered by the term 'recipient'..."*
5. **WP260 rev.01, §59, §536**: "imposible" es una situación de todo o nada; umbral alto —
   incluso sin ningún medio de contacto directo, el ejemplo del informe de crédito concluye que
   publicar información general en la web antes del registro ya hace que no sea imposible
   informar.
6. **WP260 rev.01, §61**: la excepción de "esfuerzo desproporcionado" "should not be routinely
   relied upon by data controllers who are not processing personal data for the purposes of
   archiving in the public interest, for scientific or historical research purposes or statistical
   purposes" — sin excluirla fuera de ese ámbito, exige justificación activa.
7. **WP260 rev.01, §62**: la imposibilidad o el esfuerzo desproporcionado deben estar "directly
   connected to the fact that the personal data was obtained other than from the data subject."
8. **WP260 rev.01, §548** (ejemplo del hospital, verificado): *"A large metropolitan hospital
   requires all patients... to fill in a Patient Information Form which seeks the details of two
   next-of-kin (data subjects). Given the very large volume of patients passing through the
   hospital on a daily basis, it would involve disproportionate effort... to provide all persons
   who have been listed as next-of-kin... with the information required under Article 14."*
9. **WP260 rev.01, §64** (checklist de medidas, verificado): quien invoca la excepción debe
   realizar y documentar un ejercicio de ponderación; el art. 14.5.b exige siempre hacer pública la
   información (p. ej. en la web del responsable); medidas adicionales según el caso: DPIA,
   pseudonimización, minimización de datos y plazo, medidas técnicas/organizativas de seguridad; y,
   cuando los datos no requieran identificar al interesado, el art. 11.1 es relevante: el
   responsable no está obligado a recopilar información adicional únicamente para poder
   identificarlo a efectos de cumplir el RGPD.

---

## 2. Interpretación aplicada a Vega — Art. 14.3.c

**[INTERPRETACIÓN]** El art. 4.9 y el WP260 (§319, nota 33, §608) confirman expresamente que un
"destinatario" puede ser un encargado del tratamiento — la definición no excluye a los encargados
por el mero hecho de actuar bajo instrucciones del responsable. Esto resuelve, con fuente oficial
inequívoca, la cuestión que `VEGA_Analisis_Art14_Segmento_B_v1.md` dejaba abierta ("no resuelto con
fuente oficial inequívoca localizada en esta investigación").

**Destinatarios relevantes:**

| Proveedor | ¿Recibe datos personales de la segunda persona? | ¿Cuenta como "destinatario" (art. 4.9/14.3.c)? |
|---|---|---|
| **Supabase** | Sí — dato en bruto, temporalmente | Sí |
| **Railway** | Sí — fecha, hora, coordenadas, zona horaria | Sí |
| **OpenAI** | Sí — evidencia astrológica derivada, vinculada a la relación con el usuario (bloque ya cerrado en `VEGA_Datos_Personales_Tercero_Segmento_B_v1.md`, bloque 6) | Sí |
| **PostHog** | **No** — no recibe ningún dato de nacimiento ni evidencia derivada de la segunda persona, solo categorías técnicas del experimento sobre la interacción del propio usuario | **No** — al no comunicársele ningún dato personal de la segunda persona, el art. 14.3.c no llega a activarse respecto a ella, porque el supuesto de hecho (comunicación de sus datos) no se produce |

Como la comunicación a Supabase, Railway y OpenAI está prevista de antemano y ocurre prácticamente
de inmediato tras la recogida (hecho ya verificado en `VEGA_Analisis_Art14_Segmento_B_v1.md`
bloque 1), el plazo aplicable no es el general de un mes (14.3.a), sino el momento de la primera
comunicación (14.3.c).

**Consecuencia práctica una vez se invoca el art. 14.5.b (sección 3):** cuando el responsable
sustituye la notificación individual por información pública, lo relevante pasa a ser que esa
información esté ya disponible de forma continua antes de que se produzcan las comunicaciones a
esos destinatarios, no vinculada a cada acto puntual. `/datos-de-terceros`, al ser una página
permanente, satisface esta exigencia estructuralmente.

---

## 3. Interpretación aplicada a Vega — Art. 14.5.b

**[INTERPRETACIÓN]**

- El umbral de "imposibilidad" es alto incluso sin datos de contacto (§536) — la posición correcta
  para Vega sigue siendo **esfuerzo desproporcionado, no imposibilidad literal**, como ya concluía
  `VEGA_Analisis_Art14_Segmento_B_v1.md`.
- **Precedente del hospital (§548):** es el precedente oficial más próximo disponible al Segmento
  B de Vega — un tercero (el paciente/usuario) aporta datos de otra persona (next-of-kin/segunda
  persona) para un fin que le beneficia a él, con notificación individual inviable por volumen, y
  WP29 concluye expresamente que la excepción aplica.
- **Riesgo real, no descartable (§61):** WP29 advierte que esta excepción "no debería invocarse de
  forma rutinaria" fuera de archivo/investigación/estadística — Vega no está en ese ámbito. Esto no
  excluye su aplicación, pero exige una justificación más cuidadosa que en los supuestos
  paradigmáticos.
- **Vínculo causal (§62):** se cumple en Vega — la imposibilidad práctica de contactar a la
  segunda persona es consecuencia directa de que sus datos llegan a través del usuario, no de una
  decisión de diseño ajena a esa estructura.
- **Relevancia del art. 11.1 (§64):** el propio WP260, en el contexto exacto del art. 14.5.b,
  confirma que el responsable no debería recopilar datos de contacto de la segunda persona
  únicamente para poder notificarle — hacerlo sería contrario a la minimización. Esto convierte la
  ausencia de datos de contacto de un déficit sospechoso ("excepción autoconstruida", riesgo ya
  señalado en la revisión anterior) a una consecuencia correcta y esperada del diseño, respaldada
  por el propio art. 11.1 citado en ese contexto exacto.

---

## 4. Riesgos / cautelas

- WP29 advierte expresamente que la excepción no debería invocarse de forma rutinaria fuera de
  archivo/investigación/estadística — Vega necesita justificar activamente por qué, pese a no
  estar en ese ámbito, el esfuerzo sigue siendo desproporcionado en su caso concreto (tarea del
  documento de ponderación, sección 6).
- El ejercicio de ponderación que el art. 14.5.b exige (§64) no estaba documentado formalmente
  hasta esta revisión — era una tarea pendiente, ya señalada en `VEGA_Analisis_Art14_Segmento_B_v1.md`.
- El cierre operativo de la medida sustitutiva (identidad del responsable, canal real) sigue
  bloqueado hasta que exista la sociedad — sin cambios respecto a lo ya acordado.

---

## 5. Medidas sustitutivas necesarias (contenido de la página pública)

Reafirmando, sin modificar todavía, la lista ya fijada en `VEGA_Analisis_Art14_Segmento_B_v1.md`
bloque 6, con los destinatarios ahora confirmados:

1. Que el servicio incluye el Segmento B y qué datos exactos se piden sobre la segunda persona.
2. Que esos datos proceden del usuario, no de la segunda persona directamente.
3. La finalidad (sinastría) y la base jurídica (interés legítimo, 6.1.f, ya cerrada).
4. **Los destinatarios: Supabase, Railway y OpenAI** — PostHog no necesita mencionarse respecto a
   la segunda persona.
5. El plazo de conservación exacto (ya cerrado: bruto ~2h, derivado 24h).
6. Identidad del responsable y canal de derechos — pendiente hasta que exista la sociedad.
7. Los derechos disponibles y cómo ejercerlos (arts. 11/12.2).
8. El derecho a reclamar ante la AEPD.
9. Mención expresa de que esta información se publica como mecanismo sustitutivo del art. 14.5.b.
10. Constancia de que se realizó y documentó el ejercicio de ponderación exigido por el art.
    14.5.b (`VEGA_Ponderacion_Art14_5b_Segmento_B_v1.md`) — condición documental antes del GO.

---

## 6. Nivel de confianza

**Alto para el art. 14.3.c** (fuente oficial inequívoca localizada y verificada en texto íntegro —
resuelve lo que antes era una incertidumbre genuina). **Moderado-alto para el art. 14.5.b**
(precedente oficial próximo que respalda la posición, con una cautela expresa de WP29 sobre el uso
no rutinario de esta excepción fuera de su ámbito paradigmático, que exige justificación activa).

## 7. Conclusión

**CERRABLE INTERNAMENTE**, con una condición documental pendiente antes del GO: redactar y
archivar el ejercicio formal de ponderación exigido por el art. 14.5.b
(`VEGA_Ponderacion_Art14_5b_Segmento_B_v1.md`, creado junto a esta revisión).

El art. 14.3.c queda resuelto con fuente oficial inequívoca: Supabase, Railway y OpenAI son
destinatarios; PostHog no lo es respecto a la segunda persona. El art. 14.5.b es jurídicamente
defendible en Vega, apoyado en un precedente oficial próximo (el hospital) y en el propio art.
11.1 citado en ese contexto exacto — no se trata de una cuestión sin base legal disponible, sino de
una posición defendible que requiere completar su propia documentación interna, no una consulta
externa.

No se modifica código, ni páginas públicas, ni el LIA, ni la base 6.1.f, ni las retenciones, ni
`free_text` en esta revisión.
