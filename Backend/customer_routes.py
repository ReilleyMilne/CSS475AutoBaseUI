from flask import Blueprint, jsonify, session, request
from db_utils import execute_query
import datetime

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/vehicles', methods=['GET'])
def get_customer_vehicles():
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')

    try:
        query = """
            SELECT v.*
            FROM Vehicle v
            JOIN CustomerOwnVehicle cov ON cov.Vehicle_VIN = v.VIN
            WHERE cov.Customer_ID = %s
            ORDER BY v.Year DESC, v.Make, v.Model
        """

        vehicles = execute_query(query, (customer_id,))
        
        if vehicles is None:
            return jsonify({'error': 'Failed to fetch vehicles'}), 500
        
        print(f"Fetched {len(vehicles)} vehicles for customer {customer_id}")
        return jsonify({'vehicles': vehicles}), 200
        
    except Exception as e:
        print(f"Error in get_customer_vehicles: {str(e)}")
        return jsonify({'error': 'Failed to fetch vehicles'}), 500


@customer_bp.route('/vehicle/<vin>', methods=['GET'])
def get_vehicle_details(vin):
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')
    
    try:
        # Verify customer owns this vehicle
        query = """
            SELECT v.*
            FROM Vehicle v
            JOIN CustomerOwnVehicle cov ON cov.Vehicle_VIN = v.VIN
            WHERE v.VIN = %s AND cov.Customer_ID = %s
        """

        vehicle = execute_query(query, (vin, customer_id), fetch_one=True)
        
        if vehicle:
            print(f"Fetched details for vehicle {vin}")
            return jsonify({'vehicle': vehicle}), 200
        else:
            return jsonify({'error': 'Vehicle not found or not owned by customer'}), 404
            
    except Exception as e:
        print(f"Error in get_vehicle_details: {str(e)}")
        return jsonify({'error': 'Failed to fetch vehicle details'}), 500


@customer_bp.route('/info', methods=['GET'])
def get_customer_info():
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')
    
    try:
        query = """
            SELECT ID, Name, Phone, Email, Address, Gender, Registration_Date, Closure_Date
            FROM Customer
            WHERE ID = %s
        """

        customer = execute_query(query, (customer_id,), fetch_one=True)
        
        if customer:
            print(f"Fetched details for customer {customer_id}")
            return jsonify({'customer': customer}), 200
        else:
            return jsonify({'error': 'Customer not found'}), 404
            
    except Exception as e:
        print(f"Error in get_customer_info: {str(e)}")
        return jsonify({'error': 'Failed to fetch customer details'}), 500


@customer_bp.route('/my_sales_orders', methods=['GET'])
def get_my_sales_orders():
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')
    
    try:
        query = """
            SELECT 
                so.ID,
                so.Sales_Date,
                so.Price,
                so.Vehicle_VIN,
                e.Name as Sales_Employee_Name,
                v.Make,
                v.Model,
                v.Year,
                v.Color
            FROM SalesOrder so
            LEFT JOIN Employee e ON so.Sales_Employee_ID = e.ID
            LEFT JOIN Vehicle v ON so.Vehicle_VIN = v.VIN
            WHERE so.Customer_ID = %s
            ORDER BY so.Sales_Date DESC, so.ID DESC
        """
        
        sales_orders = execute_query(query, (customer_id,))
        
        if sales_orders is not None:
            print(f"Fetched {len(sales_orders)} sales orders for customer {customer_id}")
            return jsonify({'sales_orders': sales_orders}), 200
        else:
            return jsonify({'sales_orders': []}), 200
            
    except Exception as e:
        print(f"Error in get_my_sales_orders: {str(e)}")
        return jsonify({'error': 'Failed to fetch sales orders'}), 500


@customer_bp.route('/employee/<employee_id>', methods=['GET'])
def get_employee_details(employee_id):
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        query = """
            SELECT ID, Name, Email, Phone
            FROM Employee
            WHERE ID = %s
        """
        
        employee = execute_query(query, (employee_id,), fetch_one=True)
        
        if employee:
            print(f"Fetched employee details for employee {employee_id}")
            return jsonify({'employee': employee}), 200
        else:
            return jsonify({'error': 'Employee not found'}), 404
            
    except Exception as e:
        print(f"Error in get_employee_details: {str(e)}")
        return jsonify({'error': 'Failed to fetch employee details'}), 500


@customer_bp.route('/info', methods=['PUT'])
def update_customer_info():
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Build dynamic update query based on provided fields
        allowed_fields = ['Name', 'Phone', 'Email', 'Address', 'Gender']
        update_fields = []
        values = []
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        values.append(customer_id)
        
        query = f"""
            UPDATE Customer
            SET {', '.join(update_fields)}
            WHERE ID = %s
        """
        
        result = execute_query(query, tuple(values))
        
        if result is False:
            return jsonify({'error': 'Failed to update customer info'}), 500
        
        # Fetch and return updated customer info
        fetch_query = """
            SELECT ID, Name, Phone, Email, Address, Gender, Registration_Date, Closure_Date
            FROM Customer
            WHERE ID = %s
        """
        
        updated_customer = execute_query(fetch_query, (customer_id,), fetch_one=True)
        
        if updated_customer:
            print(f"Updated customer info for customer {customer_id}")
            return jsonify({'customer': updated_customer}), 200
        else:
            return jsonify({'error': 'Customer not found'}), 404
            
    except Exception as e:
        print(f"Error in update_customer_info: {str(e)}")
        return jsonify({'error': 'Failed to update customer info'}), 500


@customer_bp.route('/my_service_records', methods=['GET'])
def get_my_service_records():
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')
    
    try:
        query = """
            SELECT 
                so.ID,
                so.Date_From,
                so.Date_To,
                so.Service_Status,
                so.Price,
                so.Vehicle_VIN,
                v.Make,
                v.Model,
                v.Year,
                e.Name as Service_Advisor_Name
            FROM ServiceOrder so
            JOIN Vehicle v ON so.Vehicle_VIN = v.VIN
            LEFT JOIN Employee e ON so.Service_Advisor_ID = e.ID
            WHERE so.Customer_ID = %s
            ORDER BY so.Date_From DESC, so.ID DESC
        """
        
        service_orders = execute_query(query, (customer_id,))
        
        if service_orders is not None:
            print(f"Fetched {len(service_orders)} service records for customer {customer_id}")
            return jsonify({'service_orders': service_orders}), 200
        else:
            return jsonify({'service_orders': []}), 200
            
    except Exception as e:
        print(f"Error in get_my_service_records: {str(e)}")
        return jsonify({'error': 'Failed to fetch service records'}), 500


@customer_bp.route('/vehicles_due_service', methods=['GET'])
def get_vehicles_due_service():
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')
    
    try:
        # Get all customer vehicles with their latest service dates
        query = """
            SELECT 
                v.VIN,
                v.Make,
                v.Model,
                v.Year,
                MAX(so.Date_From) as Last_Service_Date
            FROM Vehicle v
            JOIN CustomerOwnVehicle cov ON cov.Vehicle_VIN = v.VIN
            LEFT JOIN ServiceOrder so ON so.Vehicle_VIN = v.VIN AND so.Customer_ID = %s
            WHERE cov.Customer_ID = %s
            GROUP BY v.VIN, v.Make, v.Model, v.Year
        """
        
        vehicles = execute_query(query, (customer_id, customer_id))
        
        now = datetime.datetime.now()
        due_vehicles = []
        
        if vehicles:
            for vehicle in vehicles:
                last_service = vehicle.get('Last_Service_Date')
                
                # Check if vehicle is due (never serviced or last service > 1 year ago)
                if last_service is None:
                    due_vehicles.append(vehicle)
                else:
                    try:
                        # Handle both string and datetime formats
                        if isinstance(last_service, str):
                            last_service_date = datetime.datetime.strptime(last_service, '%Y-%m-%d')
                        else:
                            last_service_date = last_service
                        
                        days_since_service = (now - last_service_date).days
                        if days_since_service > 365:
                            due_vehicles.append(vehicle)
                    except Exception:
                        # If date parsing fails, consider it due
                        due_vehicles.append(vehicle)
        
        print(f"Found {len(due_vehicles)} vehicles due for service for customer {customer_id}")
        return jsonify({'due_vehicles': due_vehicles}), 200
        
    except Exception as e:
        print(f"Error in get_vehicles_due_service: {str(e)}")
        return jsonify({'error': 'Failed to check service due vehicles'}), 500