import { type NextRequest, type NextResponse } from "next/server";
import { updateSession } from "@/libs/supabase/middleware";
import {
  ANONYMOUS_USER_ID_COOKIE,
  ANONYMOUS_USER_ID_MAX_AGE_SECONDS,
  isTestRequest,
  TEST_TRAFFIC_COOKIE,
  TEST_TRAFFIC_MAX_AGE_SECONDS,
} from "@/libs/experiment/cookies";
import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  return applyTestTrafficCookie(request, applyAnonymousUserIdCookie(request, response));
}

// Genera anonymous_user_id aqui, de forma sincrona, ANTES de que se
// sirva cualquier HTML o se ejecute JS de cliente. Es lo que evita una
// carrera real: si en vez de esto cada fetch (GET /api/session del
// bootstrap, POST /api/segment del click) pudiera crear su propio
// anonymous_user_id cuando todavia no hay cookie, dos peticiones
// concurrentes en la primera visita podian generar DOS ids distintos y
// el ultimo Set-Cookie en llegar "ganaba", dejando el flow_attempt
// recien creado huerfano bajo el id perdedor. Centralizar la creacion
// aqui, en el unico punto que corre siempre antes que nada mas,
// garantiza que todas las peticiones de una misma carga de pagina
// comparten el mismo id desde el principio.
function applyAnonymousUserIdCookie(request: NextRequest, response: NextResponse): NextResponse {
  // Suspension de trafico real (libs/experiment/constants.ts): no minar
  // identidad para nadie que no sea trafico de test mientras el
  // responsable del tratamiento no este constituido. isTestRequest ya lee
  // tanto ?test=1 como la cookie vega_test (mas abajo en este mismo
  // archivo), asi que una visita de QA que ya tenia la cookie sigue
  // recibiendo vega_auid con normalidad.
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTestRequest(request)) return response;

  if (!request.cookies.get(ANONYMOUS_USER_ID_COOKIE)?.value) {
    response.cookies.set(ANONYMOUS_USER_ID_COOKIE, crypto.randomUUID(), {
      maxAge: ANONYMOUS_USER_ID_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }
  return response;
}

// Marca de forma persistente el trafico interno/QA (?test=1), para que
// PostHog pueda excluirlo de los dashboards (VEGA Sprint 1, seccion 14).
function applyTestTrafficCookie(request: NextRequest, response: NextResponse): NextResponse {
  const requestsTestFlag = request.nextUrl.searchParams.get("test") === "1";
  const alreadyMarked = request.cookies.get(TEST_TRAFFIC_COOKIE)?.value === "1";

  if (requestsTestFlag && !alreadyMarked) {
    response.cookies.set(TEST_TRAFFIC_COOKIE, "1", {
      maxAge: TEST_TRAFFIC_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
