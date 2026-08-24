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
    DB $FF,$80,$80,$80,$80,$80,$80,$80
    DB $80,$80,$80,$80,$80,$80,$80,$FF
    DB $FF,$03,$03,$03,$03,$03,$03,$03
    DB $03,$03,$03,$03,$03,$03,$03,$FF
END ASM

