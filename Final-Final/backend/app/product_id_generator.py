"""
Product ID Generation System for DoughNation Inventory

Generates unique Product IDs in the format: <PRODUCT_CODE>-<SEQUENCE>
- Each product has a unique 3-letter code
- Sequence starts at 1 for each product type
- Sequence increments based on database records

Examples:
- Pandesal: PDS-1, PDS-2, PDS-3
- Pan de Coco: PDC-1, PDC-2
- Banana Bread: BNB-1
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
import re


# Product Code Mapping: Product Name (normalized) -> 3-Letter Code
PRODUCT_CODE_MAP = {
    # Bread Products
    "pandesal": "PDS",
    "pandecoco": "PDC",
    "pandesalube": "PDB",
    "ensaymada": "ENS",
    "spanishbread": "SPB",
    "monay": "MON",
    "mamon": "MMN",
    "putok": "PUT",
    "tasty": "TST",
    "garlicbread": "GRB",
    
    # Pastries
    "croissant": "CRS",
    "danishpastry": "DNP",
    "danish": "DNP",
    "puffpastry": "PFP",
    "turnover": "TRN",
    "empanada": "EMP",
    
    # Cakes
    "chocolatecake": "CHC",
    "vanillacake": "VNC",
    "redvelvetcake": "RVC",
    "carrotcake": "CRC",
    "cheesecake": "CHZ",
    "blackforestcake": "BFC",
    "mochacake": "MCK",
    "strawberrycake": "STC",
    "mangobravo": "MGB",
    "ubecake": "UBC",
    
    # Muffins & Cupcakes
    "blueberrymuffin": "BBM",
    "chocolatemuffin": "CHM",
    "bananmuffin": "BNM",
    "cupcake": "CPC",
    "chocolatecupcake": "CHC",
    "vanillacupcake": "VCC",
    
    # Cookies
    "chocolatechipcookie": "CCC",
    "chocolatechipcookies": "CCC",
    "chocolatechip": "CCC",
    "oatmealcookie": "OTC",
    "oatmealcookies": "OTC",
    "sugarcookie": "SGC",
    "peanutbuttercookie": "PBC",
    "peanutbuttercookies": "PBC",
    "buttercookie": "BTC",
    "buttercookies": "BTC",
    "snickerdoodle": "SNK",
    "snickerdoodles": "SND",
    
    # Filipino Breads
    "kalihim": "KLH",
    "kababayan": "KBY",
    "pandelimon": "PDL",
    "pianono": "PNN",
    "brazodemercedes": "BDM",
    "brazo": "BDM",
    "silvanas": "SLV",
    "polvoron": "PLV",
    "barquillos": "BRQ",
    
    # Loaves
    "whiteloaf": "WLF",
    "wheatloaf": "WTL",
    "ryeloaf": "RYL",
    "frenchbread": "FRB",
    "baguette": "BGT",
    "ciabatta": "CBT",
    "sourdough": "SRD",
    "multigrain": "MLG",
    "brioche": "BRC",
    
    # Sweet Breads
    "bananabread": "BNB",
    "zucchinibread": "ZCB",
    "pumpkinbread": "PMB",
    "cornbread": "CRB",
    "cinnamonroll": "CNR",
    "cinnamonbread": "CNB",
    
    # Buns & Rolls
    "hamburgerroll": "HBR",
    "hotdogroll": "HDR",
    "dinnerroll": "DNR",
    "kaisserroll": "KSR",
    "pretzel": "PTZ",
    
    # Donuts
    "glazeddonut": "GLD",
    "chocolatedonut": "CHD",
    "jellydonut": "JLD",
    "donut": "DNT",
    "doughnut": "DNT",
    
    # Pies & Tarts
    "applepie": "APP",
    "blueberrypie": "BBP",
    "cherrypie": "CHP",
    "pecanpie": "PCP",
    "pumpkinpie": "PMP",
    "bukopie": "BKP",
    "eggtart": "EGT",
    "lemontart": "LMT",
    
    # Specialty Items
    "brownies": "BRW",
    "fudgebrownies": "FBR",
    "blondies": "BLD",
    "biscotti": "BSC",
    "scones": "SCN",
    "blueberryscone": "BBS",
    "madeleines": "MDL",
    "financiers": "FNC",
    "macarons": "MCR",
    "meringue": "MRG",
    
    # Asian Breads
    "melonpan": "MLP",
    "anpan": "ANP",
    "currypan": "CRP",
    "tangzhong": "TZG",
    "milkbread": "MLB",
    "hokkaido": "HKD",
    "shokupan": "SKP",
    
    # Flat Breads
    "focaccia": "FCC",
    "pita": "PTA",
    "naan": "NAN",
    "tortilla": "TRT",
    "lavash": "LVS",
    
    # Others
    "bagel": "BGL",
    "plainbagel": "PBG",
    "everythingbagel": "EBG",
    "muffin": "MFN",
    "cookie": "CKE",
    "pie": "PIE",
    "tart": "TRT",
    "cake": "CAK",
}


def normalize_product_name(name: str) -> str:
    """
    Normalize product name for mapping lookup.
    Removes spaces, special characters, and converts to lowercase.
    
    Examples:
        "Pan de Coco" -> "pandecoco"
        "Chocolate Chip Cookie" -> "chocolatechipcookie"
        "Pan de Sal" -> "pandesal"
    """
    if not name:
        return ""
    
    # Remove all non-alphanumeric characters and convert to lowercase
    normalized = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
    return normalized


def get_product_code(product_name: str) -> str:
    """
    Get the 3-letter product code for a given product name.
    
    If the product is in the mapping, returns the predefined code.
    Otherwise, generates a code from the product name.
    
    Args:
        product_name: The name of the product
        
    Returns:
        3-letter product code (uppercase)
        
    Examples:
        "Pandesal" -> "PDS"
        "Pan de Coco" -> "PDC"
        "New Product" -> "NWP" (auto-generated)
    """
    normalized = normalize_product_name(product_name)
    
    # Check if product exists in mapping
    if normalized in PRODUCT_CODE_MAP:
        return PRODUCT_CODE_MAP[normalized]
    
    # Auto-generate code from product name
    # Strategy: Take first letter of each word (up to 3 words)
    words = product_name.upper().split()
    
    if len(words) >= 3:
        # Use first letter of first 3 words
        code = words[0][0] + words[1][0] + words[2][0]
    elif len(words) == 2:
        # Use first 2 letters of first word + first letter of second word
        code = words[0][:2] + words[1][0]
    else:
        # Single word: use first 3 letters
        code = words[0][:3].upper()
    
    return code.upper()


def get_next_sequence_number(db: Session, product_code: str, bakery_id: int) -> int:
    """
    Get the next sequence number for a product code within a bakery.
    
    Checks the database for existing product IDs with the same code
    and returns the next sequential number.
    
    Args:
        db: Database session
        product_code: 3-letter product code (e.g., "PDS")
        bakery_id: ID of the bakery
        
    Returns:
        Next sequence number (starts at 1 if no existing items)
        
    Examples:
        If PDS-1, PDS-2, PDS-3 exist -> returns 4
        If no PDS items exist -> returns 1
    """
    # Query all product IDs for this bakery that start with the product code
    pattern = f"{product_code}-%"
    
    existing_items = db.query(models.BakeryInventory.product_id).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.product_id.like(pattern)
    ).all()
    
    if not existing_items:
        return 1
    
    # Extract sequence numbers from product IDs
    max_sequence = 0
    for item in existing_items:
        product_id = item[0]
        if product_id and '-' in product_id:
            try:
                # Extract the number after the dash
                sequence_str = product_id.split('-')[1]
                sequence = int(sequence_str)
                max_sequence = max(max_sequence, sequence)
            except (ValueError, IndexError):
                # Skip malformed product IDs
                continue
    
    return max_sequence + 1


def generate_product_id(db: Session, product_name: str, bakery_id: int) -> str:
    """
    Generate a unique Product ID for a bakery inventory item.
    
    Format: <PRODUCT_CODE>-<SEQUENCE>
    - Product code is a unique 3-letter identifier for the product type
    - Sequence is a per-product counter that starts at 1
    
    Args:
        db: Database session (required to check existing IDs)
        product_name: Name of the product
        bakery_id: ID of the bakery
        
    Returns:
        Unique product ID string
        
    Examples:
        generate_product_id(db, "Pandesal", 1) -> "PDS-00001"
        generate_product_id(db, "Pan de Coco", 1) -> "PDC-00001"
        generate_product_id(db, "Chocolate Cake", 1) -> "CHC-00001"
    """
    # Get the product code
    product_code = get_product_code(product_name)
    
    # Get the next sequence number
    sequence = get_next_sequence_number(db, product_code, bakery_id)
    
    # Combine into final product ID (5-digit format with leading zeros)
    product_id = f"{product_code}-{sequence:05d}"
    
    return product_id


def validate_product_id_format(product_id: str) -> bool:
    """
    Validate that a product ID follows the correct format.
    
    Format: <3-LETTER-CODE>-<5-DIGIT-NUMBER>
    
    Args:
        product_id: Product ID to validate
        
    Returns:
        True if valid, False otherwise
        
    Examples:
        validate_product_id_format("PDS-00001") -> True
        validate_product_id_format("ABC-12345") -> True
        validate_product_id_format("ABCD-00001") -> False
        validate_product_id_format("AB-00001") -> False
    """
    if not product_id:
        return False
    
    # Pattern: 3 uppercase letters, dash, one or more digits (accepting both old and new formats)
    pattern = r'^[A-Z]{3}-\d+$'
    return bool(re.match(pattern, product_id))


def get_product_info(product_name: str) -> dict:
    """
    Get information about a product's code without database access.
    Useful for frontend preview before saving.
    
    Args:
        product_name: Name of the product
        
    Returns:
        Dictionary with product code and other info
        
    Example:
        get_product_info("Pandesal") -> {
            "product_code": "PDS",
            "normalized_name": "pandesal",
            "is_mapped": True
        }
    """
    normalized = normalize_product_name(product_name)
    product_code = get_product_code(product_name)
    is_mapped = normalized in PRODUCT_CODE_MAP
    
    return {
        "product_code": product_code,
        "normalized_name": normalized,
        "is_mapped": is_mapped
    }