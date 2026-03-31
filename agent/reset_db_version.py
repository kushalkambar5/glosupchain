import psycopg2
try:
    conn = psycopg2.connect('postgresql://bkv:globalsupplychain@15.206.160.22:5432/supplychain')
    cur = conn.cursor()
    cur.execute("UPDATE alembic_version SET version_num = 'cbbfe61d0655'")
    conn.commit()
    print("Alembic version reset to cbbfe61d0655")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
