import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export interface CustomDialogButton {
  text?: string;
  label?: string; // Support both text and label for backwards compatibility
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  variant?: 'solid' | 'outline';
  color?: string;
}

interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
}

interface CustomDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: CustomDialogButton[];
  onDismiss?: () => void;
  textInput?: TextInputProps;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  textInput,
}) => {
  const { currentColors } = useTheme();

  const handleBackdropPress = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonStyle = (button: CustomDialogButton) => {
    // If custom color is provided, use it
    if (button.color) {
      return {
        backgroundColor: button.variant === 'outline' ? 'transparent' : button.color,
        borderColor: button.color,
        borderWidth: button.variant === 'outline' ? 1 : 0,
        color: button.variant === 'outline' ? button.color : '#FFFFFF',
      };
    }

    // Otherwise use style prop
    switch (button.style) {
      case 'destructive':
        return {
          backgroundColor: button.variant === 'outline' ? 'transparent' : '#FF3B30',
          borderColor: '#FF3B30',
          borderWidth: button.variant === 'outline' ? 1 : 0,
          color: button.variant === 'outline' ? '#FF3B30' : '#FFFFFF',
        };
      case 'cancel':
        return {
          backgroundColor: button.variant === 'outline' ? 'transparent' : currentColors.background.bg500,
          borderColor: currentColors.border,
          borderWidth: button.variant === 'outline' ? 1 : 0,
          color: currentColors.text,
        };
      default:
        return {
          backgroundColor: button.variant === 'outline' ? 'transparent' : currentColors.primary,
          borderColor: currentColors.primary,
          borderWidth: button.variant === 'outline' ? 1 : 0,
          color: button.variant === 'outline' ? currentColors.primary : '#FFFFFF',
        };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={[
                  styles.dialogContainer,
                  { backgroundColor: currentColors.background.bg500 },
                ]}
              >
                {/* Title */}
                <Text
                  style={[
                    styles.title,
                    { color: currentColors.text },
                  ]}
                >
                  {title}
                </Text>

                {/* Message */}
                {message && (
                  <Text
                    style={[
                      styles.message,
                      { color: currentColors.textSecondary },
                    ]}
                  >
                    {message}
                  </Text>
                )}

                {/* Text Input (optional) */}
                {textInput && (
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: currentColors.background.bg300,
                        color: currentColors.text,
                        borderColor: currentColors.border,
                      },
                    ]}
                    value={textInput.value}
                    onChangeText={textInput.onChangeText}
                    placeholder={textInput.placeholder}
                    placeholderTextColor={currentColors.textSecondary}
                    secureTextEntry={textInput.secureTextEntry}
                    autoFocus={true}
                  />
                )}

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                  {buttons.map((button, index) => {
                    const buttonColors = getButtonStyle(button);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.button,
                          {
                            backgroundColor: buttonColors.backgroundColor,
                            borderColor: buttonColors.borderColor,
                            borderWidth: buttonColors.borderWidth,
                          },
                          buttons.length === 1 && styles.singleButton,
                        ]}
                        onPress={() => {
                          button.onPress();
                        }}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            { color: buttonColors.color },
                          ]}
                        >
                          {button.label || button.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    width: '100%',
    minWidth: 280,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  singleButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// Helper function to show simple confirmation dialogs
export const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  dialogProps: CustomDialogProps;
} => {
  const [visible, setVisible] = React.useState(false);

  return {
    visible,
    setVisible,
    dialogProps: {
      visible,
      title,
      message,
      buttons: [
        {
          text: cancelText,
          onPress: () => {
            setVisible(false);
            if (onCancel) onCancel();
          },
          style: 'cancel',
        },
        {
          text: confirmText,
          onPress: () => {
            setVisible(false);
            onConfirm();
          },
          style: 'destructive',
        },
      ],
      onDismiss: () => {
        setVisible(false);
        if (onCancel) onCancel();
      },
    },
  };
};
