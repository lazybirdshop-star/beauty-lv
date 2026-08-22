/* Where a block that animates along a scroll track is finished saying what it
   says: the device seated with the turn done and all four callouts read, the
   fan fully open on its three faces.

   Three separate things have to agree on each of these — the block that
   animates towards it, the wheel snap that drops the reader at it, and the nav
   anchor that jumps straight to it. They live here rather than inside any one
   of the three, because an anchor that used its own copy of the number is
   exactly how `Product` came to land on a half-turned phone with no callouts
   on it. Each is a fraction of its block's own scroll span. */

/** `#stage-track`: hero and showcase share one track and one device.

    0.92, а не 0.72: широкий экран получил более поздний приход выносок (см.
    `SPIN_END_WIDE` в mockup-stage.tsx), и прежняя метка оказалась бы *до*
    того, как они появятся, — то есть якорь и доводка роняли бы читателя на
    полуобернувшийся телефон без единой карточки. 0.92 лежит после конца
    оборота на обоих экранах: на широком он кончается на 0.90, выноски встают
    на 0.79; на узком оборот кончается на 0.62, а последняя из четырёх
    карточек приходит на 0.81. Число одно на оба, потому что якорь читает его
    из разметки, а разметка про ширину окна не знает. */
export const STAGE_RESOLVED = 0.92;

/** `#looks`: the first half of the block belongs to the threads panel
    scrolling off above, so the fan does not begin to open until here. */
export const FAN_START = 0.56;
export const FAN_SPAN = 0.3;
export const FAN_OPEN = FAN_START + FAN_SPAN;
