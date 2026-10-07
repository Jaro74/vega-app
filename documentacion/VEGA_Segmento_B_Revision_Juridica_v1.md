# VEGA — Segmento B: Revisión Jurídica v1

**Estado:** Documento factual preparado para revisión jurídica externa
**Alcance:** Segmento B del experimento Vega (sinastría con datos de una segunda persona)
**Naturaleza:** Descripción técnica y factual — no contiene conclusiones jurídicas

Este documento describe de forma puramente factual y técnica cómo
funciona hoy el segmento B de Vega. No contiene conclusiones
jurídicas, no asume ninguna base jurídica ni afirma que el tratamiento
descrito sea o no conforme al RGPD — esa valoración es precisamente lo
que se solicita en las preguntas finales.

---

## 1. Qué hace el segmento B

El segmento B es una de las dos variantes del experimento Vega. En
ella, el usuario puede solicitar un análisis de compatibilidad
astrológica ("sinastría") entre sí mismo y una segunda persona, en
lugar de un análisis individual.

---

## 2. Qué introduce el usuario sobre la otra persona

El propio usuario, dentro del flujo del producto, introduce
manualmente los datos de nacimiento de esa segunda persona. La segunda
persona no accede al producto ni introduce nada ella misma.

---

## 3. Datos exactos que se solicitan sobre la segunda persona

- Fecha de nacimiento.
- Hora de nacimiento, únicamente si el usuario indica que la conoce.
- Lugar de nacimiento (como lugar y las coordenadas de latitud/longitud asociadas a ese lugar).
- Zona horaria correspondiente a ese lugar.

---

## 4. Datos que NO se solicitan sobre la segunda persona

- Nombre o apellidos.
- Dirección de correo electrónico.
- Teléfono.
- Dirección postal.
- Cualquier identificador de cuenta o red social.

---

## 5. Qué recibe Supabase (base de datos del proyecto)

Los datos de nacimiento brutos de la segunda persona (punto 3) se
almacenan de forma temporal en una tabla dedicada, vinculada
únicamente a un identificador técnico del intento de flujo del
usuario — no al nombre ni al email de nadie. Por separado, tras el
cálculo, se almacena también un resultado derivado (ver punto 10).

---

## 6. Qué recibe Railway/Vega (servicio externo de cálculo astrológico)

Fecha de nacimiento, hora (si se conoce), zona horaria y coordenadas
de ambas personas (usuario y segunda persona), necesarios para
calcular la evidencia astrológica de la sinastría. No recibe nombre,
email, ni ningún identificador interno del experimento (ni el
identificador de usuario anónimo, ni el del intento de flujo) —
únicamente un identificador de un solo uso, generado para cada llamada
concreta.

---

## 7. Qué recibe OpenAI (generación del resultado)

La categoría del motivo o situación elegida por el usuario, un texto
breve opcional escrito por el usuario, indicadores de
precisión/conocimiento de la hora de nacimiento, y evidencia
astrológica ya calculada y filtrada por Railway/Vega (aspectos entre
ambas cartas astrales). OpenAI no recibe en ningún caso la fecha, hora,
lugar o coordenadas en bruto de ninguna de las dos personas.

---

## 8. Qué NO recibe PostHog (herramienta de analítica del producto)

PostHog no recibe ningún dato de nacimiento de ninguna de las dos
personas (ni fecha, hora, lugar ni coordenadas), ni los identificadores
técnicos derivados de ese cálculo, ni el texto que el usuario pueda
escribir. PostHog únicamente recibe categorías técnicas del
experimento (por ejemplo, qué variante se asignó o si el flujo se
completó).

---

## 9. Cuándo se elimina el dato bruto de la segunda persona, y límite máximo

El diseño del sistema borra estos datos inmediatamente después de
completar correctamente el cálculo necesario. Como medida adicional,
si ese borrado inmediato no llegara a producirse por cualquier motivo,
existe un límite máximo técnico de **1 hora** (reducido desde 24 horas
el 2026-10-07, para reforzar el test de necesidad de la base jurídica
de interés legítimo), transcurrido el cual un proceso automático
programado elimina de todos modos cualquier dato bruto restante. Por
la frecuencia horaria de ese proceso, el tiempo real máximo hasta la
eliminación efectiva, en el caso excepcional de que falle el borrado
inmediato, puede aproximarse a **2 horas**.

---

## 10. Qué queda derivado, y durante cuánto tiempo

Tras el cálculo, se conserva durante un máximo de **24 horas**
(reducido desde 30 días el 2026-10-07, exclusivamente para permitir
continuidad y reintentos de corto plazo sin recalcular, no como una
ventana general de revisión posterior) un resultado derivado que
contiene únicamente aspectos astrológicos ya calculados entre ambas
personas y determinados identificadores técnicos asociados a ese
cálculo — nunca la fecha, hora, lugar o coordenadas en bruto de
ninguna de las dos personas. Transcurridas esas 24 horas, el resultado
derivado deja de poder reutilizarse para ese fin, con independencia de
si ya se ha eliminado físicamente — esta comprobación de vigencia está
verificada en el propio código de lectura, no solo en el plazo de
purga. Su eliminación física corre a cargo de un proceso automático
programado específico, con cadencia horaria (separado del proceso
diario que purga el resto del núcleo de datos personales, que mantiene
su propia cadencia sin cambios), por lo que puede existir un margen
operativo de hasta aproximadamente 1 hora adicional entre que el dato
deja de ser válido y se borra.

---

## 11. El tercero no interactúa directamente con Vega

La segunda persona cuyos datos se introducen no visita el producto, no
crea ninguna sesión propia, no recibe ninguna comunicación de Vega y
no realiza ninguna acción dentro del sistema en ningún momento de este
proceso.

---

## 12. No existe consentimiento verificable del tercero

El sistema no cuenta hoy con ningún mecanismo que registre, verifique
o permita demostrar que la segunda persona ha dado su conformidad a
este tratamiento. Quien introduce los datos es el usuario, no la
persona a la que esos datos se refieren.

---

## 13. Estado actual del tráfico

En el momento de este documento, el acceso general al experimento
(incluido el segmento B) permanece técnicamente desactivado para
usuarios reales; solo es accesible mediante tráfico de prueba
identificado expresamente como tal.

---

## Preguntas para el asesor jurídico

1. ¿Los datos tratados en este diseño deben considerarse datos personales del tercero a efectos del RGPD?
2. Si lo son, ¿qué base jurídica del artículo 6 sería adecuada?
3. ¿Qué obligaciones del artículo 14 se aplicarían y cómo deberían cumplirse?
4. ¿Es suficiente el diseño de minimización actual o recomienda cambios?
5. ¿Debe el usuario realizar alguna declaración antes de aportar estos datos?
6. ¿Es adecuada la retención: borrado inmediato/máximo técnico de 1 hora (hasta ~2 horas reales por la cadencia del cron) para el bruto, y vigencia de 24 horas sin reutilización posterior (hasta ~1 hora adicional hasta la eliminación física, por la cadencia horaria de su propio proceso de purga) para el derivado (reducidos desde 24 horas y 30 días respectivamente el 2026-10-07)?
