from flask import Flask
from flask_cors import CORS
from auth_routes import auth_bp
from customer_routes import customer_bp
from vehicle_routes import vehicle_bp
from employee_routes import employee_bp
from manager_routes import manager_bp
from datetime import timedelta

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Optional: Session timeout
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

# --- CORS configuration ---
FRONTEND_ORIGIN = "https://lemon-tree-0c3cbd80f.3.azurestaticapps.net"

# Enable CORS only for /api/* routes
CORS(
    app,
    resources={r"/api/*": {"origins": FRONTEND_ORIGIN}},
    supports_credentials=True,  # Allow cookies/session
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
# ---------------------------

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(customer_bp, url_prefix="/api/customer")
app.register_blueprint(vehicle_bp, url_prefix="/api/vehicle")
app.register_blueprint(employee_bp, url_prefix="/api/employee")
app.register_blueprint(manager_bp, url_prefix="/api/manager")