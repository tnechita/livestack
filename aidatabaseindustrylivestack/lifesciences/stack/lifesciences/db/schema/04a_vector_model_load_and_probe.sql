-- Load and prove the exact Life Sciences embedding model before compiling
-- any VECTOR_EMBEDDING-dependent PL/SQL in 04_vector.sql.
SET SERVEROUTPUT ON
DECLARE
  v_count NUMBER;
  v_probe VECTOR(384,FLOAT32,DENSE);
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_mining_models WHERE model_name = 'ALL_MINILM_L12_V2';
  IF v_count = 0 THEN
    DBMS_VECTOR.LOAD_ONNX_MODEL(
      directory => 'DATA_PUMP_DIR',
      file_name => 'all_MiniLM_L12_v2.onnx',
      model_name => 'ALL_MINILM_L12_V2',
      metadata => JSON('{"function":"embedding","embeddingOutput":"embedding","input":{"input":["DATA"]}}')
    );
  END IF;
  SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING 'Life Sciences vector readiness probe' AS DATA)
  INTO v_probe FROM dual;
  IF v_probe IS NULL THEN RAISE_APPLICATION_ERROR(-20061, 'ALL_MINILM_L12_V2 returned no 384-dimensional vector.'); END IF;
END;
/
