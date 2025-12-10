from database import get_db_connection

def get_primary_key(table_name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_NAME = %s
              AND CONSTRAINT_NAME = 'PRIMARY'
        """
        
        cursor.execute(query, (table_name,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return result['COLUMN_NAME'] if result else None
        
    except Exception as e:
        print(f"Error getting primary key for {table_name}: {str(e)}")
        return None


def get_all_tables(database_name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = %s
        """
        
        cursor.execute(query, (database_name,))
        tables = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return tables
        
    except Exception as e:
        print(f"Error getting tables: {str(e)}")
        return []


def get_table_data(table_name, where_clause=None, where_params=None, order_by=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Build query dynamically
        query = f"SELECT * FROM {table_name}"
        
        if where_clause:
            query += f" WHERE {where_clause}"
            
        if order_by:
            query += f" ORDER BY {order_by}"
        
        # Execute with or without parameters
        if where_params:
            cursor.execute(query, where_params)
        else:
            cursor.execute(query)
            
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return rows
        
    except Exception as e:
        print(f"Error getting data from {table_name}: {str(e)}")
        return []


def get_table_columns(table_name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = %s
            ORDER BY ORDINAL_POSITION
        """
        
        cursor.execute(query, (table_name,))
        columns = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return columns
        
    except Exception as e:
        print(f"Error getting columns for {table_name}: {str(e)}")
        return []


def get_foreign_keys(table_name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = %s
            AND REFERENCED_TABLE_NAME IS NOT NULL
        """
        
        cursor.execute(query, (table_name,))
        foreign_keys = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return foreign_keys
        
    except Exception as e:
        print(f"Error getting foreign keys for {table_name}: {str(e)}")
        return []


def execute_query(query, params=None, fetch_one=False):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
            
        if query.strip().upper().startswith(("INSERT", "UPDATE", "DELETE")):
            conn.commit()

        if fetch_one:
            result = cursor.fetchone()
        else:
            result = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return result

        
    except Exception as e:
        print(f"Error executing query: {str(e)}")
        return None if fetch_one else []