#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "8BP.h"
#include "minibasic.h"

int  main()
{
  _basic_print("hola");
  _8BP_setupsp_3(0,1,1);
  _8BP_setupsp_3(0,9,16);
  _8BP_locatesp_3(0,20,20);
  _8BP_printsp_1(0);
return 0;
}