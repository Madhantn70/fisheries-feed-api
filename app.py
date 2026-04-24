from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error
from datetime import datetime, date

app = Flask(__name__)

# 🔌 DB CONNECTION
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Maddy@#13",
        database="feed_management"
    )

# ✅ STANDARD RESPONSE
def success_response(message, data=None):
    return jsonify({
        "message": message,
        "data": data
    })

# =========================
# 🔹 TEST API
# =========================
@app.route('/api/test', methods=['GET'])
def test():
    return success_response("API is working")

# =========================
# 🔹 FEED TYPES
# =========================
@app.route('/api/feed-types', methods=['GET'])
def get_feed_types():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM feed_types")
        data = cursor.fetchall()

        return success_response("success", data)

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# =========================
# 🔹 TANKS
# =========================
@app.route('/api/tanks', methods=['GET'])
def get_tanks():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM tanks")
        data = cursor.fetchall()

        return success_response("success", data)

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/tanks', methods=['POST'])
def add_tank():
    try:
        data = request.json

        if not data or 'tank_name' not in data:
            return {"error": "tank_name required"}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO tanks (tank_name) VALUES (%s)",
            (data['tank_name'],)
        )
        conn.commit()

        return success_response("Tank added", {"id": cursor.lastrowid})

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/tanks/<int:id>', methods=['PUT'])
def update_tank(id):
    try:
        data = request.json

        if not data or 'tank_name' not in data:
            return {"error": "tank_name required"}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE tanks SET tank_name=%s WHERE id=%s",
            (data['tank_name'], id)
        )
        conn.commit()

        return success_response("Tank updated")

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


# 🔥 DELETE WITH CASCADE LOGIC (YOUR FIX)
@app.route('/api/tanks/<int:id>', methods=['DELETE'])
def delete_tank(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print(f"[INFO] DELETE tank {id}")

        # 1️⃣ delete logs first
        cursor.execute("DELETE FROM feed_logs WHERE tank_id = %s", (id,))

        # 2️⃣ delete tank
        cursor.execute("DELETE FROM tanks WHERE id = %s", (id,))

        conn.commit()

        return success_response("Tank and related logs deleted")

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# =========================
# 🔹 FEED STOCK
# =========================
@app.route('/api/feed-stock', methods=['POST'])
def add_feed_stock():
    try:
        data = request.json

        if not data or 'feed_type_id' not in data or 'quantity' not in data:
            return {"error": "Missing fields"}, 400

        if float(data['quantity']) <= 0:
            return {"error": "Quantity must be positive"}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO feed_stock (feed_type_id, quantity, date_added) VALUES (%s, %s, %s)",
            (data['feed_type_id'], data['quantity'], date.today())
        )
        conn.commit()

        return success_response("Stock added", {"id": cursor.lastrowid})

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# =========================
# 🔹 FEED LOGS
# =========================
@app.route('/api/feed-logs', methods=['POST'])
def add_feed_log():
    try:
        data = request.json

        if not data or 'feed_type_id' not in data or 'tank_id' not in data or 'quantity_used' not in data:
            return {"error": "Missing fields"}, 400

        if float(data['quantity_used']) <= 0:
            return {"error": "Quantity must be positive"}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO feed_logs (feed_type_id, tank_id, quantity_used, feed_time) VALUES (%s, %s, %s, %s)",
            (data['feed_type_id'], data['tank_id'], data['quantity_used'], datetime.now())
        )
        conn.commit()

        return success_response("Feed log added", {"id": cursor.lastrowid})

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/feed-logs', methods=['GET'])
def get_feed_logs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM feed_logs")
        data = cursor.fetchall()

        return success_response("success", data)

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# =========================
# 🔹 DASHBOARD
# =========================
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT 
            ft.name,
            COALESCE(fs.total_added, 0) AS total_added,
            COALESCE(fl.total_used, 0) AS total_used,
            COALESCE(fs.total_added, 0) - COALESCE(fl.total_used, 0) AS current_stock
        FROM feed_types ft
        LEFT JOIN (
            SELECT feed_type_id, SUM(quantity) AS total_added
            FROM feed_stock GROUP BY feed_type_id
        ) fs ON ft.id = fs.feed_type_id
        LEFT JOIN (
            SELECT feed_type_id, SUM(quantity_used) AS total_used
            FROM feed_logs GROUP BY feed_type_id
        ) fl ON ft.id = fl.feed_type_id
        ORDER BY current_stock ASC
        """

        cursor.execute(query)
        data = cursor.fetchall()

        return success_response("success", data)

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# =========================
# 🔹 LOW STOCK
# =========================
@app.route('/api/low-stock', methods=['GET'])
def low_stock():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT * FROM (
            SELECT 
                ft.name,
                COALESCE(fs.total_added, 0) AS total_added,
                COALESCE(fl.total_used, 0) AS total_used,
                COALESCE(fs.total_added, 0) - COALESCE(fl.total_used, 0) AS current_stock
            FROM feed_types ft
            LEFT JOIN (
                SELECT feed_type_id, SUM(quantity) AS total_added
                FROM feed_stock GROUP BY feed_type_id
            ) fs ON ft.id = fs.feed_type_id
            LEFT JOIN (
                SELECT feed_type_id, SUM(quantity_used) AS total_used
                FROM feed_logs GROUP BY feed_type_id
            ) fl ON ft.id = fl.feed_type_id
        ) AS dashboard
        WHERE current_stock < 200
        """

        cursor.execute(query)
        data = cursor.fetchall()

        return success_response("success", data)

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# =========================
# 🔹 RUN APP
# =========================
if __name__ == '__main__':
    app.run(debug=True)