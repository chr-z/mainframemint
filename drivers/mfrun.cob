       IDENTIFICATION DIVISION.
       PROGRAM-ID. MFRUN.
      ******************************************************************
      * MFRUN — batch driver for MainframeMint core.
      * stdin line 1: N (number of cases)
      * stdin lines : PGM MONTHS CENTS BPS MCENT
      *               PGM in {MFCOMPD, MFAMORT, MFSAVING}
      * stdout      : "A B C STAT" per case
      *
      * NOTE: every CALL argument is declared with the EXACT same
      * PICTURE/USAGE as the callee LINKAGE items (binary layouts must
      * agree byte-for-byte). Display copies are used only for output.
      ******************************************************************
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 IN-LINE         PIC X(100).
       01 W-PGM           PIC X(10).
       01 T-M             PIC X(16).
       01 T-C             PIC X(16).
       01 T-R             PIC X(16).
       01 T-D             PIC X(16).
       01 CASES           PIC 9(4)  COMP-5.
       01 IDX             PIC 9(4)  COMP-5.
       01 N-MONTHS        PIC 9(4)   COMP-5.
       01 N-CENTS         PIC S9(13) COMP-5.
       01 N-BPS           PIC S9(7)  COMP-5.
       01 N-MCENT         PIC S9(13) COMP-5.
       01 R-STAT          PIC S9(4)  COMP-5.
       01 R-A             PIC S9(13) COMP-5.
       01 R-B             PIC S9(13) COMP-5.
       01 R-C             PIC S9(13) COMP-5.
       01 D-A             PIC -(13)9.
       01 D-B             PIC -(13)9.
       01 D-C             PIC -(13)9.
       01 D-S             PIC -(3)9.
       PROCEDURE DIVISION.
       PARA-MAIN.
           ACCEPT IN-LINE FROM CONSOLE
           COMPUTE CASES = FUNCTION NUMVAL(IN-LINE)
           PERFORM VARYING IDX FROM 1 BY 1 UNTIL IDX > CASES
               ACCEPT IN-LINE FROM CONSOLE
               PERFORM PROCESS-LINE
           END-PERFORM
           STOP RUN.
       PROCESS-LINE.
           INSPECT IN-LINE REPLACING ALL X"0D" BY SPACE
           MOVE SPACES TO W-PGM T-M T-C T-R T-D
           UNSTRING IN-LINE DELIMITED BY ALL SPACES
               INTO W-PGM T-M T-C T-R T-D
           END-UNSTRING
           COMPUTE N-MONTHS = FUNCTION NUMVAL(T-M)
           COMPUTE N-CENTS  = FUNCTION NUMVAL(T-C)
           COMPUTE N-BPS    = FUNCTION NUMVAL(T-R)
           COMPUTE N-MCENT  = FUNCTION NUMVAL(T-D)
           MOVE 0 TO R-A R-B R-C R-STAT
           IF W-PGM = 'MFCOMPD'
              CALL 'MFCOMPD' USING N-MONTHS N-CENTS N-BPS N-MCENT
                                   R-STAT R-A R-B R-C
           ELSE
              IF W-PGM = 'MFAMORT'
                 CALL 'MFAMORT' USING N-MONTHS N-CENTS N-BPS N-MCENT
                                      R-STAT R-A R-B R-C
              ELSE
                 IF W-PGM = 'MFSAVING'
                    CALL 'MFSAVING' USING N-MONTHS N-CENTS N-BPS
                                          N-MCENT R-STAT R-A R-B R-C
                 ELSE
                    MOVE -99 TO R-STAT
                 END-IF
              END-IF
           END-IF
           MOVE R-A TO D-A
           MOVE R-B TO D-B
           MOVE R-C TO D-C
           MOVE R-STAT TO D-S
           DISPLAY FUNCTION TRIM(D-A) SPACE FUNCTION TRIM(D-B)
                   SPACE FUNCTION TRIM(D-C) SPACE FUNCTION TRIM(D-S).
