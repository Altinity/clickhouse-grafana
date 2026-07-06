SELECT t.a, s.b FROM default.left_tbl AS t GLOBAL ANY LEFT JOIN default.right_tbl AS s USING (id)
