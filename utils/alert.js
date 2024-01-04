import { Alert, Platform } from 'react-native'

const alertPolyfill = (title, description, options, extra) => {
    const result = window.confirm([title, description].filter(Boolean).join('\n'))

    if (result) {
        const confirmOption = options.find(({ style }) => style !== 'cancel')
        confirmOption?.onPress && confirmOption?.onPress()
    } else {
        console.log(options)
        const cancelOption = options.find(({ style }) => style === 'cancel')
        cancelOption?.onPress && cancelOption?.onPress()
    }
}

const alert = Platform.OS === 'web' ? alertPolyfill : Alert.alert

export default alert