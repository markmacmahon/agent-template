import { t, type MessageKey } from "@/i18n/keys";

export type ScenarioStep =
  | {
      role: "user";
      content: string;
      pauseMs?: number;
    }
  | {
      role: "assistant";
      content: string;
      chunkDelayMs?: number;
      chunkSize?: number;
      pauseMs?: number;
    };

export type ScenarioPreset = {
  id: string;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  steps: ScenarioStep[];
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "support_triage",
    labelKey: "CHAT_SCENARIO_SUPPORT",
    descriptionKey: "CHAT_SCENARIO_SUPPORT_DESC",
    steps: [
      {
        role: "user",
        content:
          "Hi, my espresso grinder just clicks when I press start. Can you check the order and help?",
        pauseMs: 600,
      },
      {
        role: "assistant",
        content:
          "Sure thing. Let me pull up your order and warranty. Give me a moment... Alright, I see the burr set you purchased last fall.",
        chunkDelayMs: 280,
        chunkSize: 40,
        pauseMs: 300,
      },
      {
        role: "assistant",
        content:
          "That clicking usually means the safety interlock isn't seated. Can you open the hopper, reseat the gasket, and press firmly? If it still fails I'll set up a replacement.",
        chunkDelayMs: 260,
        chunkSize: 42,
      },
    ],
  },
  {
    id: "live_match",
    labelKey: "CHAT_SCENARIO_MATCH",
    descriptionKey: "CHAT_SCENARIO_MATCH_DESC",
    steps: [
      {
        role: "assistant",
        content:
          "Kickoff at Lusail Stadium! Spain knock the ball around the back as Brazil sit in a mid-block. Crowd is roaring for this friendly.",
        chunkDelayMs: 230,
        chunkSize: 36,
        pauseMs: 400,
      },
      {
        role: "assistant",
        content:
          "12' – Pedri threads a pass into the box and Rodrygo forces a save. Spain dominating possession with 63%.",
        chunkDelayMs: 220,
        chunkSize: 32,
        pauseMs: 350,
      },
      {
        role: "assistant",
        content:
          "45'+1 – GOAL! Dani Olmo curls one into the top corner from the edge of the box. Spain 1 - 0 Brazil heading into halftime.",
        chunkDelayMs: 260,
        chunkSize: 30,
      },
    ],
  },
  {
    id: "reservation",
    labelKey: "CHAT_SCENARIO_RESERVATION",
    descriptionKey: "CHAT_SCENARIO_RESERVATION_DESC",
    steps: [
      {
        role: "user",
        content:
          "Can you book dinner for two at Luma Bistro tomorrow around 7:30pm? I'd like a cozy table.",
        pauseMs: 500,
      },
      {
        role: "assistant",
        content:
          "Checking Luma Bistro... they have availability at 7:15pm and 7:45pm. The corner banquette is free at 7:45pm if that's okay?",
        chunkDelayMs: 240,
        chunkSize: 38,
        pauseMs: 300,
      },
      {
        role: "assistant",
        content:
          "Seats confirmed! I've held the 7:45pm slot under your name with a note for a cozy corner. You'll get a confirmation text shortly.",
        chunkDelayMs: 260,
        chunkSize: 40,
      },
    ],
  },
  {
    id: "survey",
    labelKey: "CHAT_SCENARIO_SURVEY",
    descriptionKey: "CHAT_SCENARIO_SURVEY_DESC",
    steps: [
      {
        role: "assistant",
        content:
          "Thanks for chatting with us! Mind if I ask three quick questions about your delivery experience?",
        chunkDelayMs: 250,
        chunkSize: 32,
        pauseMs: 250,
      },
      {
        role: "assistant",
        content:
          "Question 1: On a scale of 1-5, how easy was it to track your package today?",
        chunkDelayMs: 240,
        chunkSize: 34,
        pauseMs: 250,
      },
      {
        role: "assistant",
        content:
          "Question 2: What could we improve about status updates? I can note anything from timing to tone.",
        chunkDelayMs: 250,
        chunkSize: 28,
        pauseMs: 250,
      },
      {
        role: "assistant",
        content:
          "Final question: Would you like proactive SMS alerts next time? Just reply yes/no and I'll configure it.",
        chunkDelayMs: 230,
        chunkSize: 30,
      },
    ],
  },
];

export function getScenarioLabel(id: string): string {
  const scenario = SCENARIO_PRESETS.find((option) => option.id === id);
  if (!scenario) {
    return id;
  }
  return t(scenario.labelKey);
}
