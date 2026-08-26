       IDENTIFICATION DIVISION.
       PROGRAM-ID. MFAMORT.
      ******************************************************************
      * MainframeMint — fixed-payment loan amortization.
      * CALL "MFAMORT" USING MONTHS CENTS BPS PAY STAT A B C
      *   CENTS : loan principal in whole cents (>= 0)
      *   BPS   : nominal annual rate in basis points (>= 0)
      *   PAY   : fixed monthly payment in cents (> 0)
      *   STAT  : 0 ok / -1..-3 bad input / -4 payment never covers
      *           the interest of some month
      *   A     : total interest paid (cents)
      *   B     : month index of the LAST payment actually made
      *   C     : residual balance after the term (balloon, cents)
      * The loan closes early when the principal part of a payment
      * reaches the remaining balance (final short month).
      ******************************************************************
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 W-A             PIC 9(4)  COMP-5 VALUE 0.
       01 W-ABAL          PIC S9(15) COMP-3 VALUE 0.
       01 W-AINT          PIC S9(13) COMP-3 VALUE 0.
       01 W-APRN          PIC S9(15) COMP-3 VALUE 0.
       01 W-ACCI          PIC S9(15) COMP-3 VALUE 0.
       01 W-LAST          PIC 9(4)  COMP-5 VALUE 0.
       LINKAGE SECTION.
       01 L2-MONTHS       PIC 9(4)  COMP-5.
       01 L2-CENTS        PIC S9(13) COMP-5.
       01 L2-BPS          PIC S9(7)  COMP-5.
       01 L2-MCENT        PIC S9(13) COMP-5.
       01 L2-STAT         PIC S9(4)  COMP-5.
       01 L2-A            PIC S9(13) COMP-5.
       01 L2-B            PIC S9(13) COMP-5.
       01 L2-C            PIC S9(13) COMP-5.
       PROCEDURE DIVISION USING L2-MONTHS L2-CENTS L2-BPS L2-MCENT
                                L2-STAT L2-A L2-B L2-C.
       INIT-OUT.
           MOVE 0 TO L2-A L2-B L2-C L2-STAT
           MOVE 0 TO W-ACCI W-LAST.
       CHECK-ARGS.
           IF L2-MONTHS < 1 OR L2-MONTHS > 1200
              MOVE -1 TO L2-STAT GO TO A-DONE.
           IF L2-CENTS < 0
              MOVE -2 TO L2-STAT GO TO A-DONE.
           IF L2-BPS < 0
              MOVE -3 TO L2-STAT GO TO A-DONE.
           IF L2-MCENT <= 0
              MOVE -4 TO L2-STAT GO TO A-DONE.
       AMORTIZE.
           MOVE L2-CENTS TO W-ABAL.
           PERFORM VARYING W-A FROM 1 BY 1 UNTIL W-A > L2-MONTHS
               COMPUTE W-AINT ROUNDED = W-ABAL * L2-BPS / 120000
               COMPUTE W-APRN = L2-MCENT - W-AINT
               IF W-APRN <= 0
                  MOVE -4 TO L2-STAT
                  MOVE 0 TO L2-A L2-B L2-C
                  GO TO A-DONE
               END-IF
               IF W-APRN >= W-ABAL
                  ADD W-AINT TO W-ACCI
                  MOVE 0 TO W-ABAL
                  MOVE W-A TO W-LAST
                  EXIT PERFORM
               END-IF
               SUBTRACT W-APRN FROM W-ABAL
               ADD W-AINT TO W-ACCI
               MOVE W-A TO W-LAST
           END-PERFORM.
           COMPUTE L2-A ROUNDED = W-ACCI.
           MOVE W-LAST TO L2-B.
           COMPUTE L2-C ROUNDED = W-ABAL.
       A-DONE.
           EXIT PROGRAM.
