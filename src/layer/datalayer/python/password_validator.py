
class EnhancedPasswordValidator:
    """增强的密码验证器"""
    
    def __init__(self):
        self.special_chars = ".,;@#$%^!"
        self.min_length = 8
        self.require_uppercase = True
        self.require_lowercase = True
        self.require_digit = True
        self.require_special = True

    def set_requirements(self, 
                        min_length = 8,
                        require_uppercase: bool = False,
                        require_lowercase: bool = False,
                        require_digit: bool = False,
                        require_special: bool = False,
                        special_chars = ".,;@#$%^!"):
        """设置密码要求"""
        self.min_length = min_length
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_digit = require_digit
        self.require_special = require_special
        self.special_chars = special_chars
    
    def validate(self, password: str) -> tuple[bool, list[str], dict]:
        """
        验证密码并返回详细信息
        
        Returns:
            tuple[bool, list[str], dict]: (是否通过验证, 错误信息列表, 详细统计信息)
        """
        errors = []
        stats = {
            'length': len(password),
            'uppercase': 0,
            'lowercase': 0,
            'digits': 0,
            'special': 0,
            'invalid': 0
        }
        
        # 统计字符
        for char in password:
            if char.isupper():
                stats['uppercase'] += 1
            elif char.islower():
                stats['lowercase'] += 1
            elif char.isdigit():
                stats['digits'] += 1
            elif char in self.special_chars:
                stats['special'] += 1
            else:
                stats['invalid'] += 1
        
        # 验证长度
        if stats['length'] < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters long")
        
        # 验证无效字符
        if stats['invalid'] > 0:
            errors.append("Password contains invalid characters")
        
        # 验证必需字符
        if self.require_uppercase and stats['uppercase'] == 0:
            errors.append("Password must contain at least one uppercase letter")
        if self.require_lowercase and stats['lowercase'] == 0:
            errors.append("Password must contain at least one lowercase letter")
        if self.require_digit and stats['digits'] == 0:
            errors.append("Password must contain at least one number")
        if self.require_special and stats['special'] == 0:
            errors.append(f"Password must contain at least one special character({self.special_chars})")
        
        return len(errors) == 0, errors, stats

if __name__ == "__main__":
    validator = EnhancedPasswordValidator()
    # 设置严格要求
    validator.set_requirements(
        require_uppercase=True,
        require_lowercase=True,
        require_digit=True,
        require_special=True
    )
    test_cases = [
        "Abc123!@#",
        "short",
        "UPPERCASE123",
        "lowercase123",
        "NoSpecialChars123",
        "!@#$%^!@",
    ]
    
    for password in test_cases:
        is_valid, errors, stats = validator.validate(password)
        print(f"\nPassword: {password}")
        print(f"Valid: {is_valid}")
        print("Statistics:")
        for key, value in stats.items():
            print(f"- {key}: {value}")
        if errors:
            print("Errors:")
            for error in errors:
                print(f"- {error}")
    
    '''
    Password: short
    Valid: False
    Statistics:
    - length: 5
    - uppercase: 0
    - lowercase: 5
    - digits: 0
    - special: 0
    - invalid: 0
    Errors:
    - Password must be at least 8 characters long
    - Password must contain at least one uppercase letter
    - Password must contain at least one number
    - Password must contain at least one special character(.,;'"@#$%^!)
    '''
