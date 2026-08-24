'- Includes -----------------------------------------------
#INCLUDE <putchars.bas>

PAPER 0:ink 5:cls

'- Draw sprite --------------------------------------------
putChars(10, 5, 1, 1, @Sprite_1)

' This section must not be executed
STOP

'- Sprite definitions -------------------------------------
Sprite_1:
ASM
    DB $FF,$81,$81,$81,$81,$81,$81,$FF
END ASM

