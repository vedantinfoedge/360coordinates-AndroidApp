import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../../theme';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 4, // default to 4-digit OTPs (MSG91)
  value,
  onChange,
  onComplete,
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));

  useEffect(() => {
    // Sync external value with internal state
    if (value) {
      const valueArray = value.split('').slice(0, length);
      const newOtp = new Array(length).fill('');
      valueArray.forEach((char, index) => {
        newOtp[index] = char;
      });
      setOtp(newOtp);
    } else {
      setOtp(new Array(length).fill(''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const pastedText = text.slice(0, length);
      const newOtp = [...otp];
      pastedText.split('').forEach((char, i) => {
        if (index + i < length) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const otpValue = newOtp.join('');
      onChange(otpValue);
      if (otpValue.length === length && onComplete) {
        onComplete(otpValue);
      }
      // Focus last input
      const nextIndex = Math.min(index + pastedText.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    const otpValue = newOtp.join('');
    onChange(otpValue);

    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({length}).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[
            styles.input,
            otp[index] && styles.inputFilled,
          ]}
          value={otp[index]}
          onChangeText={text => handleChange(text, index)}
          onKeyPress={e => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  input: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    ...typography.h2,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSecondary,
  },
});

export default OTPInput;

