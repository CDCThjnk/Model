import numpy as np
import ast
import re

def convert_to_list(data):
    """
    Hàm này chuyển đổi một chuỗi có định dạng list thành một list thực sự.
    Nó sẽ xử lý các lỗi và trả về một list rỗng nếu dữ liệu đầu vào không hợp lệ.
    """
    # Chỉ xử lý nếu dữ liệu là một chuỗi (str)
    if isinstance(data, str):
        try:
            # Thử chuyển đổi chuỗi thành list
            return ast.literal_eval(data)
        except (ValueError, SyntaxError):
            # Nếu có lỗi (ví dụ: chuỗi không đúng định dạng), trả về một list rỗng
            return []
    # Nếu dữ liệu không phải là chuỗi (ví dụ: NaN), cũng trả về list rỗng
    return []

def remove_dotted_words(name_string: str) -> str:
    """
    Removes standalone words ending with a period (like initials or suffixes)
    from a string.

    Args:
        name_string: The input name string.

    Returns:
        The cleaned name string.
    """
    # 1. Find and remove any whole word ending in a period (e.g., "H.", "Jr.").
    #    The pattern \b[A-Za-z]+\. finds a word boundary, one or more letters,
    #    and a literal period.
    cleaned_name = re.sub(r'\b[A-Za-z]+\.', '', name_string)

    # 2. Clean up any extra whitespace that may have been left behind.
    #    The pattern \s\s+ finds two or more spaces and replaces them with one.
    cleaned_name = re.sub(r'\s\s+', ' ', cleaned_name)

    # 3. Remove any leading/trailing spaces or commas.
    return cleaned_name.strip(' ,')

def get_institution_from_dict(education_entry):
    """
    Safely extracts the 'institution' value from a dictionary.
    Returns np.nan if the entry is not a dictionary or the key is missing.
    """
    # Check if the entry is a dictionary
    if isinstance(education_entry, dict):
        # Use .get() which returns None (or a default) if the key doesn't exist.
        # This is safer than using education_entry['institution'], which would crash.
        return education_entry.get('institution')
    
    # Return a standard missing value if the entry is not a dictionary (e.g., None, NaN, a string)
    return np.nan

def convert_degree_to_list(text):
    """
    Converts a semicolon-separated string into a list of strings.

    Args:
        text: The input string to convert.

    Returns:
        A list of strings, with whitespace removed from each element.
        Returns an empty list if the input is not a string.
    """
    if not isinstance(text, str):
        return []
    
    # Split the string by the semicolon and strip whitespace from each item
    return [item.strip() for item in text.split(';')]

def find_degree_level(degree_string):
    """
    Identifies the academic degree level from an input string.

    Args:
        degree_string: The string to analyze.

    Returns:
        'doctor', 'master', 'bachelor', or None if no match is found.
    """
    if not isinstance(degree_string, str):
        return None

    # Convert the string to lowercase for case-insensitive matching
    lower_string = degree_string.lower()

    # Check for keywords in order of precedence (doctor > master > bachelor)
    if 'doctor' in lower_string or 'doctorate' in lower_string or 'doctoral' in lower_string or 'phd' in lower_string:
        return 'doctor'
    elif 'master' in lower_string:
        return 'master'
    elif 'bachelor' in lower_string:
        return 'bachelor'
    
    return None
