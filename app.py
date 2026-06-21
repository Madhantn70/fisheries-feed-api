from flask import Flask, request, jsonify, g
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime, date
import pytz
import os
import jwt
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes under /api/ coming from Vite frontend
CORS(
    app,
    resources={r"/api/*": {"origins": [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "https://aquafeed-front.vercel.app"
    ]}},
    supports_credentials=True
)

# 🔌 DB CONNECTION
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Maddy@#13"),
        database=os.getenv("DB_NAME", "feed_management")
    )

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Alter users to add role column safely
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'viewer'")
    except Error as err:
        if err.errno == 1060 or "Duplicate column name" in str(err):
            pass
        else:
            print(f"[WARN] Failed to alter users: {err}")

    # Set existing admin email to role='admin'
    try:
        cursor.execute("UPDATE users SET role = 'admin' WHERE email = 'admin@aquafeed.com'")
    except Error as err:
        print(f"[WARN] Failed to update admin role: {err}")

    # Set any NULL roles to 'viewer'
    try:
        cursor.execute("UPDATE users SET role = 'viewer' WHERE role IS NULL")
    except Error as err:
        print(f"[WARN] Failed to update null roles: {err}")
    
    # Alter feed_stock to add user_id column
    try:
        cursor.execute("ALTER TABLE feed_stock ADD COLUMN user_id INT NULL")
        cursor.execute("ALTER TABLE feed_stock ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL")
    except Error as err:
        # Check if already exists (MySQL code 1060)
        if err.errno == 1060 or "Duplicate column name" in str(err):
            pass
        else:
            print(f"[WARN] Failed to alter feed_stock: {err}")
            
    # Create audit_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        username VARCHAR(100) NOT NULL DEFAULT 'system',
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_created (created_at),
        INDEX idx_audit_user (username)
    )
    """)

    # Insert default admin user if none exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        hashed_password = generate_password_hash("password123")
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)",
            ("admin", "admin@aquafeed.com", hashed_password, "admin")
        )
        print("[INFO] Created default admin user.")
        
    conn.commit()
    cursor.close()
    conn.close()

init_db()

# ✅ STANDARD RESPONSE
def success_response(message, data=None):
    return jsonify({
        "message": message,
        "data": data
    })


# 🔐 JWT DECORATOR
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, os.getenv("JWT_SECRET", "supersecretkey_change_me_in_production"), algorithms=["HS256"])
            g.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid!'}), 401
            
        return f(*args, **kwargs)
    return decorated


# 🔐 ADMIN ROLE DECORATOR
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'current_user') or g.current_user.get('role') != 'admin':
            return jsonify({'error': 'Admin privileges required!'}), 403
        return f(*args, **kwargs)
    return decorated


# =========================
# 🔹 AUTHENTICATION
# =========================
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        if not data or 'username' not in data or 'email' not in data or 'password' not in data:
            return {"error": "Missing required fields"}, 400
            
        username = data['username'].strip()
        email = data['email'].strip()
        password = data['password']
        
        if not username or not email or not password:
            return {"error": "Fields cannot be empty"}, 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        if cursor.fetchone():
            return {"error": "Username or email already exists"}, 400
            
        hashed_password = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)",
            (username, email, hashed_password, 'viewer')
        )
        conn.commit()
        
        return success_response("User registered successfully")
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        if not data or 'email' not in data or 'password' not in data:
            return {"error": "Email and password required"}, 400
            
        email = data['email'].strip()
        password = data['password']
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password_hash'], password):
            return {"error": "Invalid email or password"}, 401
            
        import datetime as dt
        token = jwt.encode({
            'id': user['id'],
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.utcnow() + dt.timedelta(hours=24)
        }, os.getenv("JWT_SECRET", "supersecretkey_change_me_in_production"), algorithm="HS256")
        
        log_audit(user['id'], user['username'], 'User Login', 'Auth',
                  f"{user['username']} logged in")

        return success_response("Login successful", {
            'token': token,
            'user': {
                'id': user['id'],
                'user_id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        })
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout_user():
    """Stateless JWT logout — records audit event only."""
    try:
        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'unknown')
        log_audit(uid, username, 'User Logout', 'Auth', f"{username} logged out")
        return success_response("Logged out successfully")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user():
    try:
        user_id = g.current_user.get('id')
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, username, email, role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        user['user_id'] = user['id']
        return success_response("success", user)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()


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
@token_required
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


@app.route('/api/feed-types', methods=['POST'])
@token_required
@admin_required
def add_feed_type():
    try:
        data = request.json
        if not data or 'name' not in data:
            return {"error": "name required"}, 400

        name = data['name'].strip()
        if not name or name.lower() in ('null', 'undefined'):
            return {"error": "Invalid feed type name"}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO feed_types (name) VALUES (%s)",
            (name,)
        )
        conn.commit()
        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Feed Type Created', 'Feed Types',
                  f"{username} created feed type '{name}'")

        return success_response("Feed type added", {"id": cursor.lastrowid})

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/feed-types/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_feed_type(id):
    try:
        data = request.json
        if not data or 'name' not in data:
            return {"error": "name required"}, 400

        name = data['name'].strip()
        if not name or name.lower() in ('null', 'undefined'):
            return {"error": "Invalid feed type name"}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE feed_types SET name=%s WHERE id=%s",
            (name, id)
        )
        conn.commit()
        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Feed Type Updated', 'Feed Types',
                  f"{username} updated feed type #{id} to '{name}'")

        return success_response("Feed type updated")

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/feed-types/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_feed_type(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch name before delete for audit
        cursor.execute("SELECT name FROM feed_types WHERE id = %s", (id,))
        ft_row = cursor.fetchone()
        ft_name = ft_row[0] if ft_row else f"#{id}"

        # Cascade deletes
        cursor.execute("DELETE FROM feed_logs WHERE feed_type_id = %s", (id,))
        cursor.execute("DELETE FROM feed_stock WHERE feed_type_id = %s", (id,))
        cursor.execute("DELETE FROM feed_types WHERE id = %s", (id,))

        conn.commit()
        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Feed Type Deleted', 'Feed Types',
                  f"{username} deleted feed type '{ft_name}'")

        return success_response("Feed type and associated records deleted")

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
@token_required
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


def is_valid_tank_name(name):
    if name is None:
        return False
    if not isinstance(name, str):
        return False
    name_stripped = name.strip()
    if not name_stripped:
        return False
    name_lower = name_stripped.lower()
    if name_lower in ('null', 'undefined', '0.0', '0'):
        return False
    try:
        float(name_stripped)
        return False
    except ValueError:
        pass
    return True


@app.route('/api/tanks', methods=['POST'])
@token_required
@admin_required
def add_tank():
    try:
        data = request.json

        if not data or 'tank_name' not in data:
            return {"error": "tank_name required"}, 400

        tank_name = data['tank_name']
        if not is_valid_tank_name(tank_name):
            return {"error": "Invalid tank name. Name cannot be empty, null, undefined, numeric-only, 0, or 0.0."}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO tanks (tank_name) VALUES (%s)",
            (tank_name,)
        )
        conn.commit()
        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Tank Created', 'Tanks',
                  f"{username} created tank '{tank_name}'")

        return success_response("Tank added", {"id": cursor.lastrowid})

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/tanks/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_tank(id):
    try:
        data = request.json

        if not data or 'tank_name' not in data:
            return {"error": "tank_name required"}, 400

        tank_name = data['tank_name']
        if not is_valid_tank_name(tank_name):
            return {"error": "Invalid tank name. Name cannot be empty, null, undefined, numeric-only, 0, or 0.0."}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE tanks SET tank_name=%s WHERE id=%s",
            (tank_name, id)
        )
        conn.commit()
        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Tank Updated', 'Tanks',
                  f"{username} updated tank #{id} to '{tank_name}'")

        return success_response("Tank updated")

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


# 🔥 DELETE WITH CASCADE LOGIC
@app.route('/api/tanks/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_tank(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print(f"[INFO] DELETE tank {id}")

        # Fetch name before delete for audit
        cursor.execute("SELECT tank_name FROM tanks WHERE id = %s", (id,))
        tk_row = cursor.fetchone()
        tk_name = tk_row[0] if tk_row else f"#{id}"

        # 1️⃣ delete logs first
        cursor.execute("DELETE FROM feed_logs WHERE tank_id = %s", (id,))

        # 2️⃣ delete tank
        cursor.execute("DELETE FROM tanks WHERE id = %s", (id,))

        conn.commit()

        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Tank Deleted', 'Tanks',
                  f"{username} deleted tank '{tk_name}'")

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
@token_required
@admin_required
def add_feed_stock():
    try:
        data = request.json

        if not data or 'feed_type_id' not in data or 'quantity' not in data:
            return {"error": "Missing fields"}, 400

        if float(data['quantity']) <= 0:
            return {"error": "Quantity must be positive"}, 400

        conn = get_db_connection()
        cursor = conn.cursor()

        user_id = g.current_user.get('id') if hasattr(g, 'current_user') else None

        ist = pytz.timezone("Asia/Kolkata")
        current_time = datetime.now(ist)

        cursor.execute(
            "INSERT INTO feed_stock (feed_type_id, quantity, date_added, user_id) VALUES (%s, %s, %s, %s)",
            (data['feed_type_id'], data['quantity'], current_time, user_id)
        )
        conn.commit()
        new_id = cursor.lastrowid

        # Resolve feed type name for audit description
        cursor.execute("SELECT name FROM feed_types WHERE id = %s", (data['feed_type_id'],))
        ft_row = cursor.fetchone()
        ft_name = ft_row[0] if ft_row else f"Feed #{data['feed_type_id']}"
        username = g.current_user.get('username', 'Admin')
        log_audit(user_id, username, 'Add Stock', 'Stock',
                  f"{username} added {data['quantity']} kg {ft_name}")

        return success_response("Stock added", {"id": new_id})

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/feed-stock', methods=['GET'])
@token_required
def get_feed_stock():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT fs.*, u.username
            FROM feed_stock fs
            LEFT JOIN users u ON fs.user_id = u.id
            ORDER BY fs.date_added DESC, fs.id DESC
        """)
        data = cursor.fetchall()

        # Format date object to string for JSON serialization
        for row in data:
            if isinstance(row.get('date_added'), (date, datetime)):
                row['date_added'] = row['date_added'].isoformat()

        return success_response("success", data)

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
@token_required
@admin_required
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
        new_id = cursor.lastrowid

        cursor.execute("SELECT name FROM feed_types WHERE id = %s", (data['feed_type_id'],))
        ft_row = cursor.fetchone()
        ft_name = ft_row[0] if ft_row else f"Feed #{data['feed_type_id']}"
        cursor.execute("SELECT tank_name FROM tanks WHERE id = %s", (data['tank_id'],))
        tk_row = cursor.fetchone()
        tk_name = tk_row[0] if tk_row else f"Tank #{data['tank_id']}"
        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Feed Entry', 'Feed Entry',
                  f"{username} recorded {data['quantity_used']} kg {ft_name} for {tk_name}")

        return success_response("Feed log added", {"id": new_id})

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/feed-logs', methods=['GET'])
@token_required
def get_feed_logs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM feed_logs ORDER BY feed_time DESC")
        data = cursor.fetchall()

        # Format datetime object to string for JSON serialization
        for row in data:
            if isinstance(row.get('feed_time'), datetime):
                row['feed_time'] = row['feed_time'].isoformat()

        return success_response("success", data)

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/feed-logs/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_feed_log(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM feed_logs WHERE id = %s", (id,))
        conn.commit()

        uid      = g.current_user.get('id')
        username = g.current_user.get('username', 'Admin')
        log_audit(uid, username, 'Delete Feed Log', 'Feed Entry',
                  f"{username} deleted feed log #{id}")

        return success_response("Feed log deleted")

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
@token_required
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
@token_required
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
# 🔹 AUDIT TRAIL HELPER
# =========================
def log_audit(user_id, username, action, module, description):
    """Write a single audit log entry. Silent on failure so it never breaks a request."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (user_id, username, action, module, description) VALUES (%s, %s, %s, %s, %s)",
            (user_id, username, action, module, description)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as ex:
        print(f"[WARN] audit log failed: {ex}")


# =========================
# 🔹 AUDIT TRAIL API
# =========================
@app.route('/api/audit-logs', methods=['GET'])
@token_required
@admin_required
def get_audit_logs():
    try:
        search    = request.args.get('search', '').strip()
        date_from = request.args.get('date_from', '')
        date_to   = request.args.get('date_to', '')
        username  = request.args.get('username', '').strip()

        conditions = []
        params = []

        if search:
            conditions.append("(al.description LIKE %s OR al.action LIKE %s OR al.module LIKE %s)")
            like = f"%{search}%"
            params.extend([like, like, like])
        if username:
            conditions.append("al.username = %s")
            params.append(username)
        if date_from:
            conditions.append("DATE(al.created_at) >= %s")
            params.append(date_from)
        if date_to:
            conditions.append("DATE(al.created_at) <= %s")
            params.append(date_to)

        where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT al.id, al.user_id, al.username, al.action, al.module,
                   al.description, al.created_at
            FROM audit_logs al
            {where_sql}
            ORDER BY al.created_at DESC
            LIMIT 500
        """, params)
        rows = cursor.fetchall()

        for row in rows:
            if isinstance(row.get('created_at'), datetime):
                row['created_at'] = row['created_at'].isoformat()

        return success_response("success", rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/audit-logs/users', methods=['GET'])
@token_required
@admin_required
def get_audit_users():
    """Return distinct usernames for the filter dropdown."""
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT username FROM audit_logs ORDER BY username")
        rows = [r[0] for r in cursor.fetchall()]
        return success_response("success", rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


# =========================
# 🔹 REPORTS DATA API
# =========================
@app.route('/api/reports/stock', methods=['GET'])
@token_required
@admin_required
def report_stock():
    """Current stock levels for every feed type."""
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                ft.name AS feed_type,
                COALESCE(fs.total_added, 0) AS total_added,
                COALESCE(fl.total_used,  0) AS total_used,
                COALESCE(fs.total_added, 0) - COALESCE(fl.total_used, 0) AS current_stock
            FROM feed_types ft
            LEFT JOIN (SELECT feed_type_id, SUM(quantity)      AS total_added FROM feed_stock GROUP BY feed_type_id) fs ON ft.id = fs.feed_type_id
            LEFT JOIN (SELECT feed_type_id, SUM(quantity_used) AS total_used  FROM feed_logs  GROUP BY feed_type_id) fl ON ft.id = fl.feed_type_id
            ORDER BY ft.name
        """)
        rows = cursor.fetchall()
        threshold = 200
        for r in rows:
            stock = float(r['current_stock'])
            r['threshold'] = threshold
            if stock < threshold:
                r['status'] = 'Low Stock'
            elif stock < threshold * 1.5:
                r['status'] = 'Warning'
            else:
                r['status'] = 'Healthy'
        return success_response("success", rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/reports/consumption', methods=['GET'])
@token_required
@admin_required
def report_consumption():
    """Feed consumption totals, optionally filtered by date and feed type."""
    try:
        date_from     = request.args.get('date_from', '')
        date_to       = request.args.get('date_to', '')
        feed_type_id  = request.args.get('feed_type_id', '')

        conditions = []
        params     = []
        if date_from:
            conditions.append("DATE(fl.feed_time) >= %s")
            params.append(date_from)
        if date_to:
            conditions.append("DATE(fl.feed_time) <= %s")
            params.append(date_to)
        if feed_type_id:
            conditions.append("fl.feed_type_id = %s")
            params.append(feed_type_id)

        where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT ft.name AS feed_type,
                   SUM(fl.quantity_used) AS total_consumed,
                   MIN(DATE(fl.feed_time)) AS date_from,
                   MAX(DATE(fl.feed_time)) AS date_to
            FROM feed_logs fl
            JOIN feed_types ft ON fl.feed_type_id = ft.id
            {where_sql}
            GROUP BY fl.feed_type_id, ft.name
            ORDER BY total_consumed DESC
        """, params)
        rows = cursor.fetchall()
        for r in rows:
            for k in ('date_from', 'date_to'):
                if hasattr(r.get(k), 'isoformat'):
                    r[k] = r[k].isoformat()
        return success_response("success", rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/reports/tank-usage', methods=['GET'])
@token_required
@admin_required
def report_tank_usage():
    """Per-tank, per-feed-type consumption, filtered by date and tank."""
    try:
        date_from = request.args.get('date_from', '')
        date_to   = request.args.get('date_to', '')
        tank_id   = request.args.get('tank_id', '')
        feed_type_id = request.args.get('feed_type_id', '')

        conditions = []
        params     = []
        if date_from:
            conditions.append("DATE(fl.feed_time) >= %s")
            params.append(date_from)
        if date_to:
            conditions.append("DATE(fl.feed_time) <= %s")
            params.append(date_to)
        if tank_id:
            conditions.append("fl.tank_id = %s")
            params.append(tank_id)
        if feed_type_id:
            conditions.append("fl.feed_type_id = %s")
            params.append(feed_type_id)

        where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT t.tank_name, ft.name AS feed_type,
                   fl.quantity_used, DATE(fl.feed_time) AS feed_date
            FROM feed_logs fl
            JOIN tanks      t  ON fl.tank_id      = t.id
            JOIN feed_types ft ON fl.feed_type_id = ft.id
            {where_sql}
            ORDER BY fl.feed_time DESC
        """, params)
        rows = cursor.fetchall()
        for r in rows:
            if hasattr(r.get('feed_date'), 'isoformat'):
                r['feed_date'] = r['feed_date'].isoformat()
        return success_response("success", rows)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


@app.route('/api/reports/monthly-summary', methods=['GET'])
@token_required
@admin_required
def report_monthly_summary():
    """Aggregate monthly summary statistics."""
    try:
        date_from = request.args.get('date_from', '')
        date_to   = request.args.get('date_to', '')

        log_conditions = []
        stock_conditions = []
        log_params   = []
        stock_params = []
        if date_from:
            log_conditions.append("DATE(feed_time) >= %s")
            stock_conditions.append("DATE(date_added) >= %s")
            log_params.append(date_from)
            stock_params.append(date_from)
        if date_to:
            log_conditions.append("DATE(feed_time) <= %s")
            stock_conditions.append("DATE(date_added) <= %s")
            log_params.append(date_to)
            stock_params.append(date_to)

        log_where   = ("WHERE " + " AND ".join(log_conditions))   if log_conditions   else ""
        stock_where = ("WHERE " + " AND ".join(stock_conditions)) if stock_conditions else ""

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Total added
        cursor.execute(f"SELECT COALESCE(SUM(quantity), 0) AS total FROM feed_stock {stock_where}", stock_params)
        total_added = float(cursor.fetchone()['total'])

        # Total consumed
        cursor.execute(f"SELECT COALESCE(SUM(quantity_used), 0) AS total FROM feed_logs {log_where}", log_params)
        total_consumed = float(cursor.fetchone()['total'])

        # Entry count
        cursor.execute(f"SELECT COUNT(*) AS cnt FROM feed_logs {log_where}", log_params)
        entry_count = cursor.fetchone()['cnt']

        # Most consumed feed type
        cursor.execute(f"""
            SELECT ft.name, SUM(fl.quantity_used) AS total
            FROM feed_logs fl JOIN feed_types ft ON fl.feed_type_id = ft.id
            {log_where}
            GROUP BY fl.feed_type_id ORDER BY total DESC LIMIT 1
        """, log_params)
        most_consumed = cursor.fetchone()

        # Lowest current stock
        cursor.execute("""
            SELECT ft.name,
                   COALESCE(fs.total_added,0) - COALESCE(fl.total_used,0) AS current_stock
            FROM feed_types ft
            LEFT JOIN (SELECT feed_type_id, SUM(quantity)      AS total_added FROM feed_stock GROUP BY feed_type_id) fs ON ft.id = fs.feed_type_id
            LEFT JOIN (SELECT feed_type_id, SUM(quantity_used) AS total_used  FROM feed_logs  GROUP BY feed_type_id) fl ON ft.id = fl.feed_type_id
            ORDER BY current_stock ASC LIMIT 1
        """)
        lowest_stock = cursor.fetchone()

        summary = {
            "total_added":    round(total_added, 2),
            "total_consumed": round(total_consumed, 2),
            "entry_count":    entry_count,
            "most_consumed_feed": most_consumed['name'] if most_consumed else "N/A",
            "most_consumed_qty":  round(float(most_consumed['total']), 2) if most_consumed else 0,
            "lowest_stock_feed":  lowest_stock['name'] if lowest_stock else "N/A",
            "lowest_stock_qty":   round(float(lowest_stock['current_stock']), 2) if lowest_stock else 0,
        }
        return success_response("success", summary)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


# =========================
# 🔹 PDF GENERATION
# =========================
@app.route('/api/reports/pdf', methods=['POST'])
@token_required
@admin_required
def generate_pdf():
    """Generate and stream a PDF for the requested report type."""
    import io
    from flask import send_file
    from reportlab.lib          import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles   import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units    import cm
    from reportlab.platypus     import (SimpleDocTemplate, Table as RLTable,
                                        TableStyle, Paragraph, Spacer,
                                        HRFlowable)
    from reportlab.lib.enums    import TA_CENTER, TA_RIGHT

    try:
        body        = request.json or {}
        report_type = body.get('report_type', 'stock')
        rows_data   = body.get('rows', [])
        summary     = body.get('summary', {})
        filters_txt = body.get('filters_text', '')

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            rightMargin=1.5*cm, leftMargin=1.5*cm,
            topMargin=1.5*cm,   bottomMargin=1.5*cm
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'Title', parent=styles['Heading1'],
            fontSize=16, alignment=TA_CENTER,
            textColor=colors.HexColor('#1e40af'), spaceAfter=4
        )
        sub_style = ParagraphStyle(
            'Sub', parent=styles['Normal'],
            fontSize=9, alignment=TA_CENTER,
            textColor=colors.HexColor('#6b7280'), spaceAfter=2
        )
        section_style = ParagraphStyle(
            'Section', parent=styles['Heading2'],
            fontSize=11, textColor=colors.HexColor('#1e40af'),
            spaceBefore=10, spaceAfter=4
        )
        stat_style = ParagraphStyle(
            'Stat', parent=styles['Normal'],
            fontSize=9, textColor=colors.HexColor('#374151'), spaceAfter=3
        )

        report_titles = {
            'stock':       'Current Stock Report',
            'consumption': 'Feed Consumption Report',
            'tank-usage':  'Tank Usage Report',
            'monthly':     'Monthly Summary Report',
        }
        report_title = report_titles.get(report_type, 'Report')
        generated_at = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        username     = g.current_user.get('username', 'Admin')

        story = []

        # ── Header ─────────────────────────────────────────────
        story.append(Paragraph("🐟 Fisheries Feed Management System", title_style))
        story.append(Paragraph(report_title, sub_style))
        story.append(Paragraph(f"Generated: {generated_at}  |  By: {username}", sub_style))
        if filters_txt:
            story.append(Paragraph(f"Filters: {filters_txt}", sub_style))
        story.append(HRFlowable(width="100%", thickness=1,
                                color=colors.HexColor('#dbeafe'), spaceAfter=10))

        # ── Summary Statistics ──────────────────────────────────
        if summary:
            story.append(Paragraph("Summary Statistics", section_style))
            for label, val in summary.items():
                story.append(Paragraph(f"<b>{label}:</b>  {val}", stat_style))
            story.append(Spacer(1, 0.3*cm))

        # ── Table ───────────────────────────────────────────────
        if rows_data:
            story.append(Paragraph("Data", section_style))
            headers  = list(rows_data[0].keys())
            tbl_data = [[h.replace('_', ' ').title() for h in headers]]
            for r in rows_data:
                tbl_data.append([str(r.get(h, '')) for h in headers])

            col_count = len(headers)
            col_width = (A4[0] - 3*cm) / col_count

            tbl = RLTable(tbl_data, colWidths=[col_width]*col_count, repeatRows=1)
            tbl.setStyle(TableStyle([
                ('BACKGROUND',  (0, 0), (-1,  0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR',   (0, 0), (-1,  0), colors.white),
                ('FONTNAME',    (0, 0), (-1,  0), 'Helvetica-Bold'),
                ('FONTSIZE',    (0, 0), (-1, -1), 8),
                ('ALIGN',       (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1),
                 [colors.white, colors.HexColor('#eff6ff')]),
                ('GRID',        (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('TOPPADDING',  (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING',(0, 0), (-1, -1), 5),
            ]))
            story.append(tbl)

        # ── Footer page numbers ─────────────────────────────────
        def add_page_number(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(colors.HexColor('#9ca3af'))
            canvas.drawRightString(
                A4[0] - 1.5*cm, 0.8*cm,
                f"Page {doc.page}"
            )
            canvas.restoreState()

        doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
        buf.seek(0)

        safe_type  = report_type.replace('/', '-')
        month_str  = datetime.now().strftime('%Y-%m')
        filename   = f"{safe_type}-report-{month_str}.pdf"

        return send_file(
            buf,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# =========================
# 🔹 RUN APP
# =========================
if __name__ == '__main__':
    try:
        print("[INFO] Starting Flask backend on port 5000...")
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print(f"[ERROR] Failed to start server: {str(e)}")