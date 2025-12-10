from flask import Blueprint, jsonify, request, session
from db_utils import execute_query

manager_bp = Blueprint('manager', __name__)


def _require_manager():
    user = session.get('user')
    if not user or user.get('user_type') != 'manager':
        return False
    return True


@manager_bp.route('/sales/aggregate', methods=['GET'])
def sales_aggregate():
    """Aggregate sales data by date or by employee.
    Query param: by=date|employee (default=date)
    """
    if not _require_manager():
        return jsonify({'error': 'Unauthorized'}), 401

    by = request.args.get('by', 'date')

    try:
        if by == 'employee':
            query = """
                SELECT 
                    e.ID as employee_id, 
                    e.Name as employee_name,
                    SUM(so.Price) as total_sales, 
                    COUNT(*) as order_count
                FROM SalesOrder so
                JOIN Employee e ON so.Sales_Employee_ID = e.ID
                WHERE so.Sales_Employee_ID IS NOT NULL
                GROUP BY e.ID, e.Name
                ORDER BY total_sales DESC
            """
            res = execute_query(query)
            return jsonify({'by': 'employee', 'data': res or []}), 200
        else:
            query = """
                SELECT 
                    Sales_Date as date,
                    SUM(Price) as total_sales,
                    COUNT(*) as order_count
                FROM SalesOrder
                GROUP BY Sales_Date
                ORDER BY Sales_Date DESC
            """
            res = execute_query(query)
            return jsonify({'by': 'date', 'data': res or []}), 200

    except Exception as e:
        print(f"Error in sales_aggregate: {str(e)}")
        return jsonify({'error': 'Failed to aggregate sales data'}), 500


@manager_bp.route('/service/summary', methods=['GET'])
def service_summary():
    """Return aggregated service revenue, labor hours, and parts cost/usage.
    Query param: by=date|employee (default=date)
    """
    if not _require_manager():
        return jsonify({'error': 'Unauthorized'}), 401

    by = request.args.get('by', 'date')

    try:
        if by == 'employee':
            # Aggregate by service advisor (employee assigned to service order)
            query = """
                SELECT 
                    e.ID as employee_id, 
                    e.Name as employee_name,
                    SUM(so.Price) as service_revenue,
                    COALESCE(SUM(sl.Labor_Hours), 0) as labor_hours,
                    COALESCE(SUM(p.Price * slup.Quantity), 0) as parts_cost
                FROM ServiceOrder so
                JOIN Employee e ON so.Service_Advisor_ID = e.ID
                LEFT JOIN ServiceLine sl ON so.ID = sl.Service_Order_ID
                LEFT JOIN ServiceLineUsePart slup ON sl.ID = slup.Service_Line_ID
                LEFT JOIN Part p ON slup.Part_ID = p.ID
                WHERE so.Service_Advisor_ID IS NOT NULL
                GROUP BY e.ID, e.Name
                ORDER BY service_revenue DESC
            """
            res = execute_query(query)
            return jsonify({'by': 'employee', 'data': res or []}), 200
        else:
            # Aggregate by service order date
            query = """
                SELECT 
                    so.Date_From as date,
                    SUM(so.Price) as service_revenue,
                    COALESCE(SUM(sl.Labor_Hours), 0) as labor_hours,
                    COALESCE(SUM(p.Price * slup.Quantity), 0) as parts_cost
                FROM ServiceOrder so
                LEFT JOIN ServiceLine sl ON so.ID = sl.Service_Order_ID
                LEFT JOIN ServiceLineUsePart slup ON sl.ID = slup.Service_Line_ID
                LEFT JOIN Part p ON slup.Part_ID = p.ID
                GROUP BY so.Date_From
                ORDER BY so.Date_From DESC
            """
            res = execute_query(query)
            return jsonify({'by': 'date', 'data': res or []}), 200

    except Exception as e:
        print(f"Error in service_summary: {str(e)}")
        return jsonify({'error': 'Failed to aggregate service data'}), 500


@manager_bp.route('/parts/usage', methods=['GET'])
def parts_usage():
    """Return parts usage and stock info. Optional query param `threshold` to filter low stock."""
    if not _require_manager():
        return jsonify({'error': 'Unauthorized'}), 401

    threshold = request.args.get('threshold')
    try:
        if threshold is not None:
            try:
                threshold = int(threshold)
            except ValueError:
                threshold = None

        query = """
            SELECT 
                p.ID, 
                p.Name, 
                p.Price, 
                p.Stock, 
                COALESCE(SUM(slup.Quantity), 0) as times_used
            FROM Part p
            LEFT JOIN ServiceLineUsePart slup ON p.ID = slup.Part_ID
            GROUP BY p.ID, p.Name, p.Price, p.Stock
            ORDER BY times_used DESC
        """
        res = execute_query(query)

        if threshold is not None and res:
            res = [r for r in res if r.get('Stock', 0) <= threshold]

        return jsonify({'data': res or []}), 200

    except Exception as e:
        print(f"Error in parts_usage: {str(e)}")
        return jsonify({'error': 'Failed to fetch parts usage'}), 500


@manager_bp.route('/reports/customer-vehicles', methods=['GET'])
def customer_vehicles_report():
    """Complex Report 1: Customer vehicle ownership and service history"""
    if not _require_manager():
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        query = """
            SELECT 
                C.ID AS 'Customer ID',
                C.Name AS 'Customer Name',
                COUNT(DISTINCT COV.Vehicle_VIN) AS 'Vehicle Amount',
                COUNT(DISTINCT SO.ID) AS 'Service Times'
            FROM Customer C
            LEFT JOIN CustomerOwnVehicle COV ON C.ID = COV.Customer_ID
            LEFT JOIN ServiceOrder SO ON C.ID = SO.Customer_ID
            GROUP BY C.ID, C.Name
            ORDER BY C.ID
        """
        res = execute_query(query)
        return jsonify({'data': res or []}), 200

    except Exception as e:
        print(f"Error in customer_vehicles_report: {str(e)}")
        return jsonify({'error': 'Failed to generate customer vehicles report'}), 500


@manager_bp.route('/reports/waiting-vehicles', methods=['GET'])
def waiting_vehicles_report():
    """Complex Report 2: Vehicles waiting for service with required parts"""
    if not _require_manager():
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        query = """
            SELECT 
                C.ID AS 'Customer ID',
                C.Name AS 'Customer Name',
                SO.Vehicle_VIN AS 'Vehicle VIN',
                SO.Service_Status AS 'Status',
                P.ID AS 'Part ID',
                P.Name AS 'Part Name',
                SLUP.Quantity AS 'Quantity',
                P.Stock AS 'Stock'
            FROM Customer C
            JOIN ServiceOrder SO ON C.ID = SO.Customer_ID
            JOIN ServiceLine SL ON SO.ID = SL.Service_Order_ID
            JOIN ServiceLineUsePart SLUP ON SL.ID = SLUP.Service_Line_ID
            JOIN Part P ON SLUP.Part_ID = P.ID
            WHERE SO.Service_Status = 'WAITING'
            ORDER BY C.ID, SO.Vehicle_VIN
        """
        res = execute_query(query)
        return jsonify({'data': res or []}), 200

    except Exception as e:
        print(f"Error in waiting_vehicles_report: {str(e)}")
        return jsonify({'error': 'Failed to generate waiting vehicles report'}), 500


@manager_bp.route('/reports/employee-performance', methods=['GET'])
def employee_performance_report():
    """Complex Report 3: Employee performance with Seattle customer count"""
    if not _require_manager():
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        query = """
            SELECT 
                E.ID AS 'Employee ID',
                E.Name AS 'Employee Name',
                COUNT(SO.ID) AS 'Vehicle Sold',
                (SELECT COUNT(DISTINCT SO2.ID)
                 FROM SalesOrder SO2
                 JOIN Customer C2 ON SO2.Customer_ID = C2.ID
                 WHERE SO2.Sales_Employee_ID = E.ID
                 AND SO2.Sales_Date >= '2024-01-01'
                 AND SO2.Sales_Date <= '2024-12-31'
                 AND C2.Address LIKE '%Seattle%') AS 'Seattle Customers'
            FROM Employee E
            LEFT JOIN SalesOrder SO ON E.ID = SO.Sales_Employee_ID
            WHERE SO.Sales_Date >= '2024-01-01' 
            AND SO.Sales_Date <= '2024-12-31'
            GROUP BY E.ID, E.Name
            ORDER BY COUNT(SO.ID) DESC
        """
        res = execute_query(query)
        return jsonify({'data': res or []}), 200

    except Exception as e:
        print(f"Error in employee_performance_report: {str(e)}")
        return jsonify({'error': 'Failed to generate employee performance report'}), 500