-- Retained-volume migration: existing wildcard vector columns must not be
-- reused as evidence for the fixed 384/FLOAT32/DENSE Life Sciences contract.
SET SERVEROUTPUT ON
DECLARE
  v_fixed_count NUMBER;
  PROCEDURE normalize_embedding(p_table VARCHAR2, p_index VARCHAR2) IS
    v_count NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = UPPER(p_table);
    IF v_count = 0 THEN RETURN; END IF;
    BEGIN EXECUTE IMMEDIATE 'DROP INDEX ' || p_index; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -1418 THEN RAISE; END IF; END;
    EXECUTE IMMEDIATE 'DELETE FROM ' || p_table;
    EXECUTE IMMEDIATE 'ALTER TABLE ' || p_table || ' MODIFY (embedding VECTOR(384,FLOAT32,DENSE))';
    EXECUTE IMMEDIATE 'CREATE VECTOR INDEX ' || p_index || ' ON ' || p_table || '(embedding) ORGANIZATION NEIGHBOR PARTITIONS WITH DISTANCE COSINE WITH TARGET ACCURACY 95';
  END;
BEGIN
  SELECT COUNT(*) INTO v_fixed_count
  FROM user_tab_columns
  WHERE data_type = 'VECTOR'
    AND REPLACE(UPPER(vector_info), ' ', '') = 'VECTOR(384,FLOAT32,DENSE)'
    AND (table_name = 'PRODUCT_EMBEDDINGS' OR table_name = 'POST_EMBEDDINGS')
    AND column_name = 'EMBEDDING';
  IF v_fixed_count = 2 THEN
    DBMS_OUTPUT.PUT_LINE('Fixed Life Sciences vector schema already present; no migration DDL.');
    RETURN;
  END IF;
  normalize_embedding('product_embeddings', 'IDX_PRODUCT_VEC');
  normalize_embedding('post_embeddings', 'IDX_POST_VEC');
END;
/
COMMIT;
