import type { Action, CardDatabase, PlayerState } from "@lotr-tcg/engine";
import { CardFace } from "../card/CardFace.js";

interface HandProps {
  player: PlayerState;
  cardDb: CardDatabase;
  viewerActions: Action[];
  onAction: (action: Action) => void;
  /** Called instead of dispatching when the clicked card needs a target chosen first (items). */
  onBeginTargeting: (itemInstanceId: string, legalTargetIds: string[]) => void;
}

export function Hand({ player, cardDb, viewerActions, onAction, onBeginTargeting }: HandProps) {
  return (
    <div className="hand">
      {player.hand.map((instance) => {
        const card = cardDb.getCard(instance.cardId);

        // Items produce one legal action per possible target; collect them so a
        // click starts target selection rather than auto-picking the first.
        const itemActions = viewerActions.filter(
          (a): a is Extract<Action, { type: "playItem" }> =>
            a.type === "playItem" && a.instanceId === instance.instanceId
        );
        const directAction = viewerActions.find(
          (a) =>
            (a.type === "playLocation" ||
              a.type === "playCharacterToBench" ||
              a.type === "playEvent" ||
              a.type === "playStory") &&
            "instanceId" in a &&
            a.instanceId === instance.instanceId
        );

        const playable = itemActions.length > 0 || Boolean(directAction);
        const onClick = playable
          ? () => {
              if (itemActions.length > 0) {
                onBeginTargeting(
                  instance.instanceId,
                  itemActions.map((a) => a.targetInstanceId)
                );
              } else if (directAction) {
                onAction(directAction);
              }
            }
          : undefined;

        return (
          <CardFace
            key={instance.instanceId}
            card={card}
            size="hand"
            highlighted={playable}
            dimmed={!playable}
            onClick={onClick}
          />
        );
      })}
      {player.hand.length === 0 && <div className="hand__empty">No cards in hand</div>}
    </div>
  );
}
