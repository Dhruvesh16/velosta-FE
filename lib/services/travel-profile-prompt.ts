import type { TravelProfileAnswers } from "@/lib/stores/onboarding-store";

function pickClimate(v: TravelProfileAnswers["climatePreference"]) {
  if (v === "cool_breezy") return "prefers cool and breezy destinations";
  if (v === "warm_sunny") return "prefers warm and sunny destinations";
  return "is open to both cool and warm destinations";
}

function pickPace(v: TravelProfileAnswers["pacePreference"]) {
  if (v === "packed") return "likes packed itineraries";
  if (v === "slow_relaxed") return "prefers slow and relaxed travel";
  return "enjoys a balanced pace";
}

function pickRandom(v: TravelProfileAnswers["randomPlaceComfort"]) {
  if (v === "yes") return "is comfortable with spontaneous places even without reviews";
  if (v === "depends") return "is selective about trying places without reviews";
  return "prefers well-reviewed places";
}

function pickEnergy(v: TravelProfileAnswers["placeEnergy"]) {
  if (v === "adventurous") return "gets excited by adventurous experiences";
  if (v === "chill_calm") return "gets excited by calm and chill places";
  return "likes a mix of adventurous and calm experiences";
}

function pickSocial(v: TravelProfileAnswers["socialSpotFocus"]) {
  if (v === "absolutely") return "cares strongly about social-media-worthy spots";
  if (v === "sometimes") return "likes including a few social-media-worthy spots";
  return "does not prioritize social-media spots";
}

export function buildTravelProfilePrompt(
  profile: TravelProfileAnswers | null | undefined
): string {
  if (!profile) return "";
  return ` Traveler profile: user ${pickClimate(profile.climatePreference)}, ${pickPace(
    profile.pacePreference
  )}, ${pickRandom(profile.randomPlaceComfort)}, ${pickEnergy(
    profile.placeEnergy
  )}, and ${pickSocial(
    profile.socialSpotFocus
  )}. Use this profile consistently while planning each day.`;
}

