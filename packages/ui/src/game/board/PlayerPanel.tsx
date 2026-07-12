import type { Action, CardDatabase, PlayerId, PlayerState } from "@lotr-tcg/engine";
import { CardFace } from "../card/CardFace.js";

interface PlayerPanelProps {
  player: PlayerState;
  cardDb: CardDatabase;
  isViewer: boolean;
  /** Legal actions for the viewer, used to make location taps / bench promotion / attack clickable. */
  viewerActions: Action[];
  onAction: (action: Action) => void;
  /** Set when the viewer is choosing a target for an item; instanceIds that may be clicked. */
  targetableIds?: Set<string>;
  onPickTarget?: (instanceId: string) => void;
}

export function PlayerPanel({
  player,
  cardDb,
  isViewer,
  viewerActions,
  onAction,
  targetableIds,
  onPickTarget,
}: PlayerPanelProps) {
  const findAction = (predicate: (a: Action) => boolean): Action | undefined => viewerActions.find(predicate);

  const renderBoardCard = (instance: PlayerState["bench"][number], slot: "active" | "bench") => {
    const card = cardDb.getCard(instance.cardId);
    const isTargetable = targetableIds?.has(instance.instanceId) ?? false;

    let clickAction: Action | undefined;
    if (isViewer && !targetableIds) {
      if (slot === "bench") {
        clickAction = findAction((a) => a.type === "moveToActive" && a.instanceId === instance.instanceId);
      } else {
        clickAction = findAction((a) => a.type === "declareAttack" && a.attackerInstanceId === instance.instanceId);
      }
    }

    const onClick = isTargetable
      ? () => onPickTarget?.(instance.instanceId)
      : clickAction
        ? () => onAction(clickAction)
        : undefined;

    return (
      <CardFace
        key={instance.instanceId}
        card={card}
        instance={instance}
        cardDb={cardDb}
        highlighted={isTargetable || Boolean(clickAction)}
        onClick={onClick}
      />
    );
  };

  return (
    <section className={`panel ${isViewer ? "panel--self" : "panel--opponent"}`}>
      <div className="panel__meta">
        <span className="panel__player">{player.id === "player1" ? "Player 1" : "Player 2"}</span>
        <span className="panel__hope" title="Hope — reach 0 and you lose">
          ✨ {player.hopeTotal}
        </span>
        <span title="Cards left in deck">🂠 {player.deck.length}</span>
        <span title="Discard pile">🗑 {player.discard.length}</span>
        <span title="Available resources this turn">◆ {player.resourcePool}</span>
        {player.corruptionTrack > 0 && (
          <span className="panel__corruption" title="Corruption — at 10 you fall to the Shadow and lose">
            ☠ {player.corruptionTrack}/10
          </span>
        )}
        {!isViewer && <span title="Cards in hand">✋ {player.hand.length}</span>}
      </div>

      <div className="panel__board">
        <div className="panel__locations">
          {player.locationsInPlay.map((loc) => {
            const tapAction = isViewer
              ? findAction((a) => a.type === "tapLocation" && a.instanceId === loc.instanceId)
              : undefined;
            return (
              <CardFace
                key={loc.instanceId}
                card={cardDb.getCard(loc.cardId)}
                instance={loc}
                cardDb={cardDb}
                highlighted={Boolean(tapAction)}
                onClick={tapAction ? () => onAction(tapAction) : undefined}
              />
            );
          })}
          {player.locationsInPlay.length === 0 && <div className="slot slot--empty">Locations</div>}
        </div>

        <div className="panel__battlefield">
          <div className="panel__active">
            {player.active ? renderBoardCard(player.active, "active") : <div className="slot slot--empty">Active</div>}
          </div>
          <div className="panel__bench">
            {player.bench.map((c) => renderBoardCard(c, "bench"))}
            {player.bench.length === 0 && <div className="slot slot--empty">Bench</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
