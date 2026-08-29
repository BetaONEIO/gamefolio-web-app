-- Refresh cached user levels after rebuilding total_xp from the
-- authoritative XP ledger.
UPDATE "users"
SET "level" = CASE
  WHEN "total_xp" >= 995000
    THEN 50 + FLOOR(("total_xp" - 995000) / 50000)
  WHEN "total_xp" >= 866000 THEN 47
  WHEN "total_xp" >= 825000 THEN 46
  WHEN "total_xp" >= 785000 THEN 45
  WHEN "total_xp" >= 746000 THEN 44
  WHEN "total_xp" >= 708000 THEN 43
  WHEN "total_xp" >= 671000 THEN 42
  WHEN "total_xp" >= 635000 THEN 41
  WHEN "total_xp" >= 600000 THEN 40
  WHEN "total_xp" >= 566000 THEN 39
  WHEN "total_xp" >= 533000 THEN 38
  WHEN "total_xp" >= 501000 THEN 37
  WHEN "total_xp" >= 470000 THEN 36
  WHEN "total_xp" >= 440000 THEN 35
  WHEN "total_xp" >= 411000 THEN 34
  WHEN "total_xp" >= 383000 THEN 33
  WHEN "total_xp" >= 356000 THEN 32
  WHEN "total_xp" >= 330000 THEN 31
  WHEN "total_xp" >= 305000 THEN 30
  WHEN "total_xp" >= 281000 THEN 29
  WHEN "total_xp" >= 258000 THEN 28
  WHEN "total_xp" >= 236000 THEN 27
  WHEN "total_xp" >= 215000 THEN 26
  WHEN "total_xp" >= 195000 THEN 25
  WHEN "total_xp" >= 176000 THEN 24
  WHEN "total_xp" >= 158000 THEN 23
  WHEN "total_xp" >= 141000 THEN 22
  WHEN "total_xp" >= 125000 THEN 21
  WHEN "total_xp" >= 110000 THEN 20
  WHEN "total_xp" >= 96000 THEN 19
  WHEN "total_xp" >= 83000 THEN 18
  WHEN "total_xp" >= 71000 THEN 17
  WHEN "total_xp" >= 60000 THEN 16
  WHEN "total_xp" >= 50000 THEN 15
  WHEN "total_xp" >= 41000 THEN 14
  WHEN "total_xp" >= 33000 THEN 13
  WHEN "total_xp" >= 26000 THEN 12
  WHEN "total_xp" >= 20000 THEN 11
  WHEN "total_xp" >= 15000 THEN 10
  WHEN "total_xp" >= 11000 THEN 9
  WHEN "total_xp" >= 8000 THEN 8
  WHEN "total_xp" >= 5500 THEN 7
  WHEN "total_xp" >= 3500 THEN 6
  WHEN "total_xp" >= 2000 THEN 5
  WHEN "total_xp" >= 1000 THEN 4
  WHEN "total_xp" >= 500 THEN 3
  WHEN "total_xp" >= 100 THEN 2
  ELSE 1
END;