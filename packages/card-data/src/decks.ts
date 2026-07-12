/**
 * Prebuilt 30-card starter decks (up to 3 copies of a card). A proper
 * deck-builder screen is milestone M4; until then these are the two decks
 * the UI offers.
 */
export interface DeckDefinition {
  id: string;
  name: string;
  description: string;
  cardIds: string[];
}

function copies(cardId: string, count: number): string[] {
  return Array.from({ length: count }, () => cardId);
}

export const FELLOWSHIP_DECK: DeckDefinition = {
  id: "fellowship-starter",
  name: "The Fellowship",
  description: "Resilient heroes of the Free Peoples, backed by healing and card draw.",
  cardIds: [
    ...copies("the-shire", 4),
    ...copies("rivendell", 3),
    ...copies("lothlorien", 2),
    ...copies("frodo-baggins", 2),
    ...copies("samwise-gamgee", 2),
    ...copies("merry-brandybuck", 1),
    ...copies("pippin-took", 1),
    ...copies("aragorn-strider", 2),
    ...copies("legolas", 2),
    ...copies("gimli", 2),
    ...copies("boromir", 1),
    ...copies("gandalf-the-grey", 1),
    ...copies("sting", 1),
    ...copies("mithril-shirt", 1),
    ...copies("anduril", 1),
    ...copies("a-elbereth-gilthoniel", 1),
    ...copies("ent-draught", 1),
    ...copies("council-of-elrond", 1),
    ...copies("the-beacons-are-lit", 1),
  ],
};

export const MORDOR_DECK: DeckDefinition = {
  id: "mordor-starter",
  name: "Hosts of Mordor",
  description: "Cheap aggressive attackers that trade resilience for raw power.",
  cardIds: [
    ...copies("mordor", 4),
    ...copies("barad-dur", 3),
    ...copies("mines-of-moria", 3),
    ...copies("goblin-scout", 2),
    ...copies("orc-raider", 3),
    ...copies("warg-rider", 2),
    ...copies("grima-wormtongue", 1),
    ...copies("uruk-hai-warrior", 3),
    ...copies("cave-troll", 2),
    ...copies("nazgul", 1),
    ...copies("witch-king-of-angmar", 1),
    ...copies("morgul-blade", 1),
    ...copies("orcish-armour", 1),
    ...copies("fell-screech", 1),
    ...copies("whips-of-the-masters", 1),
    ...copies("the-eye-of-sauron", 1),
  ],
};

export const ROHAN_DECK: DeckDefinition = {
  id: "rohan-starter",
  name: "Riders of Rohan",
  description: "Fast, hard-hitting cavalry with battle-cry buffs that strike before the foe can settle.",
  cardIds: [
    ...copies("edoras", 4),
    ...copies("helms-deep", 3),
    ...copies("meduseld", 3),
    ...copies("westfold-rider", 2),
    ...copies("gamling", 1),
    ...copies("rohirrim-lancer", 3),
    ...copies("eomer", 2),
    ...copies("eowyn", 2),
    ...copies("theodred", 1),
    ...copies("royal-guard", 1),
    ...copies("theoden-king", 1),
    ...copies("erkenbrand", 1),
    ...copies("herugrim", 1),
    ...copies("riders-spear", 1),
    ...copies("charge-of-the-rohirrim", 1),
    ...copies("horn-of-helm-hammerhand", 1),
    ...copies("muster-of-rohan", 1),
    ...copies("ride-out-at-dawn", 1),
  ],
};

export const GONDOR_DECK: DeckDefinition = {
  id: "gondor-starter",
  name: "Stewards of Gondor",
  description: "Stalwart defenders of the White City who outlast the enemy behind high walls.",
  cardIds: [
    ...copies("osgiliath", 4),
    ...copies("minas-tirith", 3),
    ...copies("dol-amroth", 3),
    ...copies("soldier-of-the-tower", 2),
    ...copies("beregond", 1),
    ...copies("citadel-guard", 2),
    ...copies("ranger-of-ithilien", 3),
    ...copies("madril", 1),
    ...copies("denethor", 1),
    ...copies("faramir", 2),
    ...copies("knight-of-dol-amroth", 1),
    ...copies("forlong-the-fat", 1),
    ...copies("tower-shield", 1),
    ...copies("blade-of-westernesse", 1),
    ...copies("rangers-ambush", 1),
    ...copies("for-gondor", 1),
    ...copies("the-white-tree-blooms", 1),
    ...copies("reinforcements-from-the-fiefs", 1),
  ],
};

export const STARTER_DECKS: DeckDefinition[] = [FELLOWSHIP_DECK, ROHAN_DECK, GONDOR_DECK, MORDOR_DECK];
