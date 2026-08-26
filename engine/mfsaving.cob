       IDENTIFICATION DIVISION.
       PROGRAM-ID. MFSAVING.
      ******************************************************************
      * MainframeMint — recurring deposit plan.
      * CALL "MFSAVING" USING MONTHS CENTS BPS DEP STAT A B C
      *   CENTS : starting balance in cents (>= 0)
      *   BPS   : nominal annual rate in basis points (>= 0)
      *   DEP   : deposit per month in cents (>= 0); lands at the START
      *           of the month, interest posts right after
      *   STAT  : 0 ok / -1..-3 bad input / -4 negative deposit
      *   A     : final balance (cents)
      *   B     : total interest earned (cents)
      ******************************************************************
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 W-S             PIC 9(4)  COMP-5 VALUE 0.
       01 W-SBAL          PIC S9(15) COMP-3 VALUE 0.
       01 W-SINT          PIC S9(13) COMP-3 VALUE 0.
       01 W-ACCI          PIC S9(15) COMP-3 VALUE 0.
       LINKAGE SECTION.
       01 L3-MONTHS       PIC 9(4)  COMP-5.
       01 L3-CENTS        PIC S9(13) COMP-5.
       01 L3-BPS          PIC S9(7)  COMP-5.
       01 L3-MCENT        PIC S9(13) COMP-5.
       01 L3-STAT         PIC S9(4)  COMP-5.
       01 L3-A            PIC S9(13) COMP-5.
       01 L3-B            PIC S9(13) COMP-5.
       01 L3-C            PIC S9(13) COMP-5.
       PROCEDURE DIVISION USING L3-MONTHS L3-CENTS L3-BPS L3-MCENT
                                L3-STAT L3-A L3-B L3-C.
       INIT-OUT.
           MOVE 0 TO L3-A L3-B L3-C L3-STAT
           MOVE 0 TO W-ACCI.
       CHECK-ARGS.
           IF L3-MONTHS < 1 OR L3-MONTHS > 1200
              MOVE -1 TO L3-STAT GO TO S-DONE.
           IF L3-CENTS < 0
              MOVE -2 TO L3-STAT GO TO S-DONE.
           IF L3-BPS < 0
              MOVE -3 TO L3-STAT GO TO S-DONE.
           IF L3-MCENT < 0
              MOVE -4 TO L3-STAT GO TO S-DONE.
       ACCUMULATE.
           MOVE L3-CENTS TO W-SBAL.
           PERFORM VARYING W-S FROM 1 BY 1 UNTIL W-S > L3-MONTHS
               ADD L3-MCENT TO W-SBAL
               COMPUTE W-SINT ROUNDED = W-SBAL * L3-BPS / 120000
               ADD W-SINT TO W-SBAL
               ADD W-SINT TO W-ACCI
           END-PERFORM.
           COMPUTE L3-A ROUNDED = W-SBAL.
           COMPUTE L3-B ROUNDED = W-ACCI.
       S-DONE.
           EXIT PROGRAM.
