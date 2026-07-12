import type { Action, CardDatabase, PlayerState } from "@lotr-tcg/engine";
import { CardFace } from "../card/CardFace.js";

export interface TargetingRequest {
  actionType: "playItem" | "evolveCharacter";
  instanceId: string;
  legalTargetIds: string[];
}

interface HandProps {
  player: PlayerState;
  cardDb: CardDatabase;
  viewerActions: Action[];
  onAction: (action: Action) => void;
  /** Called instead of dispatching when the clicked card needs a target chosen first (items, evolutions). */
  onBeginTargeting: (request: TargetingRequest) => void;
}

export function Hand({ player, cardDb, viewerActions, onAction, onBeginTargeting }: HandProps) {
  return (
    <div className="hand">
      {player.hand.map((instance) => {
        const card = cardDb.getCard(instance.cardId);

        // Items and evolutions produce one legal action per possible target;
        // collect them so a click starts target selection rather than
        // auto-picking the first.
        const targetedActions = viewerActions.filter(
          (a): a is Extract<Action, { type: "playItem" | "evolveCharacter" }> =>
            (a.type === "playItem" || a.type === "evolveCharacter") && a.instanceId === instance.instanceId
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

        const playable = targetedActions.length > 0 || Boolean(directAction);
        const onClick = playable
          ? () => {
              if (targetedActions.length > 0) {
                onBeginTargeting({
                  actionType: targetedActions[0]!.type,
                  instanceId: instance.instanceId,
                  legalTargetIds: targetedActions.map((a) => a.targetInstanceId),
                });
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
