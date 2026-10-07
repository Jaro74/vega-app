"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { readAcquisitionFromLocation } from "@/libs/analytics/client-acquisition";
import { getOrCreateSessionId } from "@/libs/analytics/client-ids";
import { captureExperimentEvent, type Sprint1EventProperties } from "@/libs/analytics/events";
import { resolveNextStep } from "@/libs/experiment/flow-progress";
import type { ImplementedEventName } from "@/libs/experiment/constants";
import type { FlowStep, OwnProfilePrecision } from "@/types/experiment";
import type { SessionResponse } from "@/types/api";

import type { CaptureEventFn } from "@/components/experiment/flow/capture";
import OwnProfileStep from "@/components/experiment/flow/OwnProfileStep";
import PartnerStep from "@/components/experiment/flow/PartnerStep";
import PaywallStep from "@/components/experiment/flow/PaywallStep";
import PreviewStep from "@/components/experiment/flow/PreviewStep";
import ProblemStep from "@/components/experiment/flow/ProblemStep";
import WaitlistStep from "@/components/experiment/flow/WaitlistStep";

type LoadStatus = "loading" | "ready" | "not-found";
type UiSection = "problem" | "own_profile" | "partner" | "onboarding_complete" | "paywall" | "waitlist";

function sectionFromFlowStep(step: FlowStep): UiSection {
  if (step === "problem" || step === "problem_text") return "problem";
  if (step === "partner_intro" || step === "partner_data") return "partner";
  if (step === "preview") return "onboarding_complete";
  if (step === "paywall" || step === "access_intent") return "paywall";
  if (step === "waitlist") return "waitlist";
  return "own_profile";
}

// Componente unico de flujo (VEGA_Plan_Tecnico, seccion 3): renderiza
// segun segment + step, nunca hay rutas /flow-a o /flow-b. El estado de
// negocio (que paso persistido es el ultimo) viene de GET /api/session;
// la navegacion DENTRO de un checkpoint (ej. fecha -> hora -> lugar del
// perfil propio) es estado local de cada Step, no se persiste hasta el
// submit final de ese checkpoint (mismo contrato de API que Sprint 0).
export default function FlowPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [section, setSection] = useState<UiSection>("problem");
  const eventsFiredRef = useRef(false);

  useEffect(() => {
    fetch("/api/session")
      .then((response) => (response.ok ? (response.json() as Promise<SessionResponse>) : null))
      .then((data) => {
        if (!data || !data.segment || !data.flowAttemptId) {
          setStatus("not-found");
          router.replace("/explorar");
          return;
        }

        setSession(data);
        setSection(sectionFromFlowStep(resolveNextStep(data.segment, data.lastCompletedStep)));
        setStatus("ready");

        if (eventsFiredRef.current) return;
        eventsFiredRef.current = true;

        const baseProps: Sprint1EventProperties = {
          anonymousUserId: data.anonymousUserId,
          sessionId: getOrCreateSessionId(),
          segment: data.segment,
          isPrimaryAttempt: data.isPrimaryAttempt,
          isTest: data.isTest,
          trafficSource: data.acquisition.trafficSource,
          utmSource: data.acquisition.utmSource,
          utmMedium: data.acquisition.utmMedium,
          utmCampaign: data.acquisition.utmCampaign,
          utmContent: data.acquisition.utmContent,
          placement: data.acquisition.placement,
          deviceType: readAcquisitionFromLocation().deviceType,
        };

        captureExperimentEvent("segment_entry", baseProps);
        captureExperimentEvent("onboarding_start", baseProps);
      })
      .catch(() => setStatus("not-found"));
  }, [router]);

  const capture: CaptureEventFn = useCallback(
    (eventName: ImplementedEventName, extra?: Partial<Sprint1EventProperties>) => {
      if (!session) return;
      captureExperimentEvent(eventName, {
        anonymousUserId: session.anonymousUserId,
        sessionId: getOrCreateSessionId(),
        segment: session.segment,
        isPrimaryAttempt: session.isPrimaryAttempt,
        isTest: session.isTest,
        trafficSource: session.acquisition.trafficSource,
        utmSource: session.acquisition.utmSource,
        utmMedium: session.acquisition.utmMedium,
        utmCampaign: session.acquisition.utmCampaign,
        utmContent: session.acquisition.utmContent,
        placement: session.acquisition.placement,
        deviceType: readAcquisitionFromLocation().deviceType,
        ...extra,
      });
    },
    [session]
  );

  const handleProblemComplete = useCallback(() => setSection("own_profile"), []);

  const handleOwnProfileComplete = useCallback(
    (result: { precision: OwnProfilePrecision; nextStep: "partner" | "preview" }) => {
      setSection(result.nextStep === "partner" ? "partner" : "onboarding_complete");
    },
    []
  );

  const handlePartnerComplete = useCallback(() => setSection("onboarding_complete"), []);

  const handlePreviewCompleted = useCallback(() => setSection("paywall"), []);

  const handleIntentConfirmed = useCallback(() => setSection("waitlist"), []);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </main>
    );
  }

  if (status === "not-found" || !session || !session.segment || !session.flowAttemptId) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-16">
      <progress
        className="progress progress-primary w-full max-w-xl"
        value={
          section === "problem"
            ? 1
            : section === "own_profile"
              ? 2
              : section === "partner"
                ? 3
                : section === "onboarding_complete"
                  ? 4
                  : section === "paywall"
                    ? 5
                    : 6
        }
        max={session.segment === "A" ? 5 : 6}
      />

      {section === "problem" && (
        <ProblemStep
          segment={session.segment}
          flowAttemptId={session.flowAttemptId}
          capture={capture}
          onComplete={handleProblemComplete}
        />
      )}

      {section === "own_profile" && (
        <OwnProfileStep
          segment={session.segment}
          flowAttemptId={session.flowAttemptId}
          capture={capture}
          onComplete={handleOwnProfileComplete}
        />
      )}

      {section === "partner" && (
        <PartnerStep flowAttemptId={session.flowAttemptId} capture={capture} onComplete={handlePartnerComplete} />
      )}

      {section === "onboarding_complete" && (
        <PreviewStep
          flowAttemptId={session.flowAttemptId}
          segment={session.segment}
          capture={capture}
          onEditPartner={session.segment === "B" ? () => setSection("partner") : undefined}
          onPreviewCompleted={handlePreviewCompleted}
        />
      )}

      {section === "paywall" && (
        <PaywallStep flowAttemptId={session.flowAttemptId} capture={capture} onIntentConfirmed={handleIntentConfirmed} />
      )}

      {section === "waitlist" && (
        <WaitlistStep
          flowAttemptId={session.flowAttemptId}
          capture={capture}
          initialWaitlistSubmitted={session.waitlistSubmitted}
        />
      )}

      <a href="/explorar" className="link link-primary text-sm">
        Cambiar de segmento
      </a>
    </main>
  );
}
