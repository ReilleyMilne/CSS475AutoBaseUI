from flask import Blueprint, jsonify, session, request
from db_utils import execute_query

vehicle_bp = Blueprint('vehicle', __name__)

@vehicle_bp.route('/vehicles', methods=['GET'])
def get_vehicles():
    """Get all vehicles that haven't been sold yet"""
    try:
        query = """
            SELECT v.VIN, v.Make, v.Model, v.Color, v.Year, v.Mileage, v.Price
            FROM Vehicle v
            WHERE v.VIN NOT IN (SELECT Vehicle_VIN FROM SalesOrder)
            ORDER BY v.Make, v.Model, v.Year
        """

        vehicles = execute_query(query)
        
        if vehicles:
            print(f"Fetched {len(vehicles)} available vehicles")
            return jsonify({'vehicle': vehicles}), 200
        else:
            return jsonify({'vehicle': []}), 200
            
    except Exception as e:
        print(f"Error in get_vehicles: {str(e)}")
        return jsonify({'error': 'Failed to fetch vehicles'}), 500


@vehicle_bp.route('/vehicles/buy/<vin>', methods=['POST'])
def buy_vehicle(vin):
    """Customer purchases a vehicle"""
    user = session.get('user')
    if not user or user.get('user_type') != 'customer':
        return jsonify({'error': 'Unauthorized'}), 401
    
    customer_id = user.get('id')
    
    data = request.get_json()
    price = data.get('price')
    
    if not price:
        return jsonify({'error': 'Price is required'}), 400

    try:
        # Check if vehicle exists and is not already sold
        check_query = """
            SELECT VIN, Price 
            FROM Vehicle 
            WHERE VIN = %s AND VIN NOT IN (SELECT Vehicle_VIN FROM SalesOrder)
        """
        vehicle = execute_query(check_query, (vin,), fetch_one=True)
        
        if not vehicle:
            return jsonify({'error': 'Vehicle not available for purchase'}), 404
        
        # Create sales order (Sales_Employee_ID is NULL initially, can be assigned later)
        insert_query = """
            INSERT INTO SalesOrder (Customer_ID, Sales_Employee_ID, Vehicle_VIN, Sales_Date, Price) 
            VALUES (%s, NULL, %s, CURDATE(), %s)
        """
        result = execute_query(insert_query, (customer_id, vin, price))
        
        if result is False:
            return jsonify({'error': 'Failed to create sales order'}), 500
        
        # Add vehicle to customer's owned vehicles
        ownership_query = """
            INSERT INTO CustomerOwnVehicle (Customer_ID, Vehicle_VIN) 
            VALUES (%s, %s)
        """
        ownership_result = execute_query(ownership_query, (customer_id, vin))
        
        if ownership_result is False:
            return jsonify({'error': 'Failed to assign vehicle ownership'}), 500
        
        print(f"Customer {customer_id} purchased vehicle {vin}")
        return jsonify({'message': 'Vehicle purchased successfully!'}), 200
        
    except Exception as e:
        print(f"Error buying vehicle: {str(e)}")
        return jsonify({'error': 'Failed to complete purchase'}), 500