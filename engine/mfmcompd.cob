       IDENTIFICATION DIVISION.
       PROGRAM-ID. MFCOMPD.
      ******************************************************************
      * MainframeMint — compound growth of a lump sum.
      * CALL "MFCOMPD" USING MONTHS CENTS BPS MCENT STAT A B C
      *   MONTHS : number of months (1..1200)
      *   CENTS  : principal in whole cents (>= 0)
      *   BPS    : nominal annual rate in basis points (>= 0)
      *   MCENT  : unused (kept for the uniform signature)
      *   STAT   : 0 ok / -1 bad months / -2 negative principal /
      *            -3 negative rate
      *   A      : final balance in whole cents
      * Interest posts monthly: round half away from zero at cent level.
      ******************************************************************
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 W-C             PIC 9(4)  COMP-5 VALUE 0.
       01 W-BAL           PIC S9(15) COMP-3 VALUE 0.
       01 W-I             PIC S9(13) COMP-3 VALUE 0.
       LINKAGE SECTION.
       01 L-MONTHS        PIC 9(4)  COMP-5.
       01 L-CENTS         PIC S9(13) COMP-5.
       01 L-BPS           PIC S9(7)  COMP-5.
       01 L-MCENT         PIC S9(13) COMP-5.
       01 L-STAT          PIC S9(4)  COMP-5.
       01 L-A             PIC S9(13) COMP-5.
       01 L-B             PIC S9(13) COMP-5.
       01 L-C             PIC S9(13) COMP-5.
       PROCEDURE DIVISION USING L-MONTHS L-CENTS L-BPS L-MCENT L-STAT
                                L-A L-B L-C.
       INIT-OUT.
           MOVE 0 TO L-A L-B L-C L-STAT.
       CHECK-ARGS.
           IF L-MONTHS < 1 OR L-MONTHS > 1200
              MOVE -1 TO L-STAT GO TO C-DONE.
           IF L-CENTS < 0
              MOVE -2 TO L-STAT GO TO C-DONE.
           IF L-BPS < 0
              MOVE -3 TO L-STAT GO TO C-DONE.
       GROW.
           MOVE L-CENTS TO W-BAL.
           PERFORM VARYING W-C FROM 1 BY 1 UNTIL W-C > L-MONTHS
               COMPUTE W-I ROUNDED = W-BAL * L-BPS / 120000
               ADD W-I TO W-BAL
           END-PERFORM.
           COMPUTE L-A ROUNDED = W-BAL.
       C-DONE.
           EXIT PROGRAM.
