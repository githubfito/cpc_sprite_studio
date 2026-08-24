'- Includes -----------------------------------------------
#INCLUDE <putchars.bas>

PAPER 0:ink 5:cls

'- Draw sprite --------------------------------------------
putChars(10, 5, 2, 2, @Sprite_1)

' This section must not be executed
STOP

'- Sprite definitions -------------------------------------
Sprite_1:
ASM
    DB $FF,$C0,$C0,$C0,$C0,$C0,$C0,$C0
    DB $C0,$80,$80,$80,$80,$80,$80,$FF
    DB $FF,$03,$03,$03,$03,$03,$03,$03
    DB $03,$01,$01,$01,$01,$01,$01,$FF
END ASM

