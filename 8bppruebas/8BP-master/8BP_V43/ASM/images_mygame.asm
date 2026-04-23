IMAGE_LIST
;---------------------------------------------------------------------------------------------
;pondremos aqui una lista de las imagenes que queremos usar sin especificar la direccion de memoria desde basic
; de este modo el comando |SETUPSP,<id>,9,<address> se transforma en |SETUPSP,<id>,9,<numero>
; la ventaja de no usar direcciones de memoria en basic es que si ampliamos los graficos o se reensamblan en 
; direcciones diferentes, el numero que asignemos no cambiara
; NO tienen que tener todas un numero, solo aquellas que vamos a usar con |setupsp, id, 9,<num>
; se empiezan a numerar en 16
; podemos usar hasta 255 imagenes especificadas de este modo 
; no hace falta que la lista tenga 255 elementos. es de longitud variable, incluso puede estar vacia
;----------------------------------------------------------------------------------------------
dw TOCINO; 16

; ahora las imagenes
;=================================================
; si no vas a usar el comando PRINTAT,  sino simplemente los caracteres del amstrad, entonces
; puedes comentar la linea "read"
_BEGIN_ALPHABET
read "alphabet_default.asm"
_END_ALPHABET
;=================================================
_BEGIN_FLIP_IMAGES
;=================================================
; aqui pon las imagenes que se definen como otras existentes pero flipeadas horizontalmente. 

; los frames del soldado a la izquierda los defino como flipeados. es mas lento pero gasta menos ram

;=================================================
_END_FLIP_IMAGES
;=================================================



;=================================================
_BEGIN_BG_IMAGES
;=================================================
; aqui las imagenes de fondo
; si quieres flipearlas primero debe indicarse en la seccion de flip
; por ejemplo, si has dibujado MY_IMAGE, puedes flipearla en la seccion flip y obtener MY_IMAGE_FLIP
; y despues puedes obtener la imagen de fondo de dicha imagen de fondo.
; al reves no se puede, es decir, no puedes flipear una imagen de fondo.
; BG_MY_IMAGE dw MY_IMAGE
; BG_MY_IMAGE_FLIP dw MY_IMAGE_FLIP
;=================================================
_END_BG_IMAGES
;=================================================



;=================================================
_BEGIN_IMAGES
;=================================================
; 8BP ASM Export

TOCINO
   DB &0a, &14 ; Metadata (W bytes, H pixels)
  DB &00,&00,&00,&00,&00,&00,&00,&00,&00,&00 ; Row 0
  DB &00,&00,&00,&00,&00,&00,&00,&00,&00,&00 ; Row 1
  DB &00,&00,&00,&00,&00,&00,&00,&00,&00,&00 ; Row 2
  DB &00,&00,&00,&00,&14,&28,&00,&00,&00,&00 ; Row 3
  DB &00,&00,&00,&00,&2C,&1C,&00,&00,&00,&00 ; Row 4
  DB &00,&00,&00,&14,&48,&24,&28,&00,&00,&00 ; Row 5
  DB &00,&00,&00,&14,&C0,&30,&28,&00,&00,&00 ; Row 6
  DB &00,&00,&14,&38,&90,&30,&34,&28,&00,&00 ; Row 7
  DB &00,&00,&2D,&0F,&90,&30,&0F,&1E,&00,&00 ; Row 8
  DB &00,&14,&0F,&0F,&38,&34,&0F,&0F,&28,&00 ; Row 9
  DB &00,&25,&0F,&37,&0F,&0F,&3B,&0F,&1A,&00 ; Row 10
  DB &00,&14,&0F,&3B,&1F,&2F,&37,&0F,&28,&00 ; Row 11
  DB &00,&00,&2D,&37,&22,&11,&3B,&1E,&00,&00 ; Row 12
  DB &00,&00,&34,&1B,&0A,&05,&27,&38,&00,&00 ; Row 13
  DB &00,&10,&02,&2D,&0A,&05,&1E,&01,&20,&00 ; Row 14
  DB &00,&01,&00,&14,&0A,&05,&28,&00,&02,&00 ; Row 15
  DB &00,&00,&00,&00,&20,&10,&00,&00,&00,&00 ; Row 16
  DB &00,&00,&00,&00,&00,&00,&00,&00,&00,&00 ; Row 17
  DB &00,&00,&00,&00,&00,&00,&00,&00,&00,&00 ; Row 18
  DB &00,&00,&00,&00,&00,&00,&00,&00,&00,&00 ; Row 19
;=================================================
_END_IMAGES
;=================================================

;=================================================
_BEGIN_3D_ZOOM_IMAGES
;=================================================
; limites aplicables a todas las imagenes con zoom
; para estos limites se considera el horizonte como el 0 y hacia abajo va creciendo hasta 200

_ZOOM_LIMIT_A
db 120; entre 0 y limitA se pone imagen 3

_ZOOM_LIMIT_B
db 50
;db 80; entre este limite y el limite A, se pone imagen 2
;mas cerca que limit B se pone imagen 1
;=================================================
; las imagenes de tipo zoom se definen aqui. 

;CARTEL_ZOOM
;db 1; ancho simbolico
;db 1; alto simbolico
;dw CARTEL1, CARTEL2, CARTEL3



;=================================================
_END_3D_ZOOM_IMAGES
;=================================================

;=================================================================
_BEGIN_3D_SEGMENTS
;=================================================================
; el ancho es el de la scanline
; el alto es el alto real
; luego va el dx, que puede ser positivo ( inclinado a izquierda) o negativo (inclinado a derecha)
; finalmente podria ir un dy que indique alto de patron de repeticion
db 0; esto es para que la primera imagen de tipo segmento sea > _3D_SEGMENTS
;--------------------------------------------------------------------

; 
;----------------- SEGMENTOS RECTOS --------------------------------
;SEGMENT_L0
;db 20; ancho
;db 50; alto
;db 0; dx
;db 192,192,192,192, 192,192,192,192 ,192,240,240, 0, 0, 0, 0, 0, 0, 0, 0, 0
;-------------------------------------------------------------------


;=================================================
_END_3D_SEGMENTS
;=================================================


_END_GRAPH