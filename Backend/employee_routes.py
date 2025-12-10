from flask import Blueprint, jsonify, session
from db_utils import execute_query

employee_bp = Blueprint('employee', __name__)

@employee_bp.route('/employees', methods=['GET'])
def get_employees():
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        query = """
            SELECT ID, Name, Email, Phone, Gender, Hire_Date, End_Date, Address
            FROM Employee
            ORDER BY ID
        """

        employees = execute_query(query)

        if employees:
            print("Fetched all employees")
            return jsonify({'employees': employees}), 200
        else:
            return jsonify({'error': 'Employees not found'}), 404
            
    except Exception as e:
        print(f"Error in get_employees: {str(e)}")
        return jsonify({'error': 'Failed to fetch employees'}), 500


@employee_bp.route('/sales_orders', methods=['GET'])
def get_sales_orders():
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        query = """
            SELECT 
                so.ID,
                so.Sales_Date,
                so.Price,
                so.Vehicle_VIN,
                so.Sales_Employee_ID,
                c.Name as Customer_Name,
                e.Name as Sales_Employee_Name,
                v.Make,
                v.Model,
                v.Year
            FROM SalesOrder so
            JOIN Customer c ON so.Customer_ID = c.ID
            LEFT JOIN Employee e ON so.Sales_Employee_ID = e.ID
            LEFT JOIN Vehicle v ON so.Vehicle_VIN = v.VIN
            ORDER BY so.ID DESC
        """

        sales_orders = execute_query(query)

        if sales_orders:
            print("Fetched all sales orders")
            return jsonify({'sales_orders': sales_orders}), 200
        else:
            return jsonify({'error': 'Sales orders not found'}), 404
            
    except Exception as e:
        print(f"Error in get_sales_orders: {str(e)}")
        return jsonify({'error': 'Failed to fetch sales orders'}), 500


@employee_bp.route('/my_sales_orders', methods=['GET'])
def get_my_sales_orders():
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    employee_id = user.get('id')
    
    try:
        query = """
            SELECT 
                so.ID,
                so.Sales_Date,
                so.Price,
                so.Vehicle_VIN,
                c.Name as Customer_Name,
                v.Make,
                v.Model,
                v.Year
            FROM SalesOrder so
            JOIN Customer c ON so.Customer_ID = c.ID
            LEFT JOIN Vehicle v ON so.Vehicle_VIN = v.VIN
            WHERE so.Sales_Employee_ID = %s
            ORDER BY so.Sales_Date DESC, so.ID DESC
        """
        
        sales_orders = execute_query(query, (employee_id,))
        
        if sales_orders is not None:
            print(f"Fetched {len(sales_orders)} sales orders for employee {employee_id}")
            return jsonify({'sales_orders': sales_orders}), 200
        else:
            return jsonify({'sales_orders': []}), 200
            
    except Exception as e:
        print(f"Error in get_my_sales_orders: {str(e)}")
        return jsonify({'error': 'Failed to fetch sales orders'}), 500


@employee_bp.route('/sales_orders/assign/<employee_ID>/<sales_order_ID>', methods=['PUT'])
def assign_employee(employee_ID, sales_order_ID):
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        query = """
            UPDATE SalesOrder
            SET Sales_Employee_ID = %s
            WHERE ID = %s
        """
        
        result = execute_query(query, (employee_ID, sales_order_ID))

        return jsonify({'message': 'Employee assigned successfully'}), 200
            
    except Exception as e:
        print(f"Error in assign_employee: {str(e)}")
        return jsonify({'error': 'Failed to assign employee'}), 500


@employee_bp.route('/customer/<customer_id>', methods=['GET'])
def get_customer_details(customer_id):
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        query = """
            SELECT ID, Name, Email, Phone, Address, Gender, Registration_Date, Closure_Date
            FROM Customer
            WHERE ID = %s
        """
        
        customer = execute_query(query, (customer_id,), fetch_one=True)
        
        if customer:
            print(f"Fetched customer details for customer {customer_id}")
            return jsonify({'customer': customer}), 200
        else:
            return jsonify({'error': 'Customer not found'}), 404
            
    except Exception as e:
        print(f"Error in get_customer_details: {str(e)}")
        return jsonify({'error': 'Failed to fetch customer details'}), 500


@employee_bp.route('/vehicle/<vin>', methods=['GET'])
def get_vehicle_details(vin):
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'customer', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        query = """
            SELECT VIN, Make, Model, Color, Year, Mileage, Price
            FROM Vehicle
            WHERE VIN = %s
        """
        
        vehicle = execute_query(query, (vin,), fetch_one=True)
        
        if vehicle:
            print(f"Fetched vehicle details for VIN {vin}")
            return jsonify({'vehicle': vehicle}), 200
        else:
            return jsonify({'error': 'Vehicle not found'}), 404
            
    except Exception as e:
        print(f"Error in get_vehicle_details: {str(e)}")
        return jsonify({'error': 'Failed to fetch vehicle details'}), 500


@employee_bp.route('/sales/vehicle/<vin>', methods=['GET'])
def get_sales_by_vehicle(vin):
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        query = """
            SELECT 
                so.ID,
                so.Sales_Date,
                so.Price,
                so.Vehicle_VIN,
                c.Name as customer_name,
                e.Name as sales_employee_name
            FROM SalesOrder so
            LEFT JOIN Customer c ON so.Customer_ID = c.ID
            LEFT JOIN Employee e ON so.Sales_Employee_ID = e.ID
            WHERE so.Vehicle_VIN = %s
            ORDER BY so.Sales_Date DESC, so.ID DESC
        """

        rows = execute_query(query, (vin,))
        return jsonify({'sales_orders': rows or []}), 200

    except Exception as e:
        print(f"Error in get_sales_by_vehicle: {str(e)}")
        return jsonify({'error': 'Failed to fetch sales for vehicle'}), 500


@employee_bp.route('/sales/customer/<customer_id>', methods=['GET'])
def get_sales_by_customer(customer_id):
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        query = """
            SELECT 
                so.ID,
                so.Sales_Date,
                so.Price,
                so.Vehicle_VIN,
                e.Name as sales_employee_name,
                v.Make,
                v.Model,
                v.Year
            FROM SalesOrder so
            LEFT JOIN Employee e ON so.Sales_Employee_ID = e.ID
            LEFT JOIN Vehicle v ON so.Vehicle_VIN = v.VIN
            WHERE so.Customer_ID = %s
            ORDER BY so.Sales_Date DESC, so.ID DESC
        """

        rows = execute_query(query, (customer_id,))
        return jsonify({'sales_orders': rows or []}), 200

    except Exception as e:
        print(f"Error in get_sales_by_customer: {str(e)}")
        return jsonify({'error': 'Failed to fetch sales for customer'}), 500


@employee_bp.route('/service/vehicle/<vin>', methods=['GET'])
def get_service_by_vehicle(vin):
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        query = """
            SELECT 
                so.ID,
                so.Date_From,
                so.Date_To,
                so.Service_Status,
                so.Price,
                so.Vehicle_VIN,
                e.Name as assigned_employee,
                sl.Service_Type as service_type,
                sl.Labor_Hours as labor_hours,
                sl.Labor_Rate as labor_rate,
                p.Name as part_name,
                p.Price as part_price,
                slup.Quantity as part_quantity
            FROM ServiceOrder so
            LEFT JOIN Employee e ON so.Service_Advisor_ID = e.ID
            LEFT JOIN ServiceLine sl ON so.ID = sl.Service_Order_ID
            LEFT JOIN ServiceLineUsePart slup ON sl.ID = slup.Service_Line_ID
            LEFT JOIN Part p ON slup.Part_ID = p.ID
            WHERE so.Vehicle_VIN = %s
            ORDER BY so.Date_From DESC, so.ID DESC
        """

        rows = execute_query(query, (vin,))
        return jsonify({'service_orders': rows or []}), 200

    except Exception as e:
        print(f"Error in get_service_by_vehicle: {str(e)}")
        return jsonify({'error': 'Failed to fetch service for vehicle'}), 500


@employee_bp.route('/service/customer/<customer_id>', methods=['GET'])
def get_service_by_customer(customer_id):
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        query = """
            SELECT 
                so.ID,
                so.Date_From,
                so.Date_To,
                so.Service_Status,
                so.Price,
                so.Vehicle_VIN,
                c.Name as customer_name,
                e.Name as assigned_employee,
                sl.Service_Type as service_type,
                sl.Labor_Hours as labor_hours,
                sl.Labor_Rate as labor_rate,
                p.Name as part_name,
                p.Price as part_price,
                slup.Quantity as part_quantity
            FROM ServiceOrder so
            LEFT JOIN Customer c ON so.Customer_ID = c.ID
            LEFT JOIN Employee e ON so.Service_Advisor_ID = e.ID
            LEFT JOIN ServiceLine sl ON so.ID = sl.Service_Order_ID
            LEFT JOIN ServiceLineUsePart slup ON sl.ID = slup.Service_Line_ID
            LEFT JOIN Part p ON slup.Part_ID = p.ID
            WHERE so.Customer_ID = %s
            ORDER BY so.Date_From DESC, so.ID DESC
        """

        rows = execute_query(query, (customer_id,))
        return jsonify({'service_orders': rows or []}), 200

    except Exception as e:
        print(f"Error in get_service_by_customer: {str(e)}")
        return jsonify({'error': 'Failed to fetch service for customer'}), 500


@employee_bp.route('/parts/report_shortage', methods=['POST'])
def report_part_shortage():
    user = session.get('user')
    if not user or user.get('user_type') not in ('employee', 'manager'):
        return jsonify({'error': 'Unauthorized'}), 401

    from flask import request
    body = request.json or {}
    threshold = body.get('threshold', 5)

    try:
        threshold = int(threshold)
    except Exception:
        return jsonify({'error': 'Invalid threshold'}), 400

    try:
        query = """
            SELECT ID, Name, Price, Stock
            FROM Part
            WHERE Stock <= %s
            ORDER BY Stock ASC, ID ASC
        """

        rows = execute_query(query, (threshold,))

        print(f"Part shortage report by user {user.get('username')} (threshold={threshold}): {len(rows or [])} items")

        return jsonify({'shortages': rows or [], 'threshold': threshold}), 200

    except Exception as e:
        print(f"Error in report_part_shortage: {str(e)}")
        return jsonify({'error': 'Failed to generate shortage report'}), 500