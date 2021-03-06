import {TuyaDevice, TuyaDeviceState} from '../../TuyaWebApi';
import {CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {COLOR_MODES, ColorModes} from './index';
import {TuyaWebCharacteristic} from './base';
import {ColorAccessory} from '../ColorAccessory';
import {BaseAccessory} from '../BaseAccessory';

export type HueCharacteristicData = { color: { hue?: string }, color_mode: ColorModes }
type DeviceWithHueCharacteristic = TuyaDevice<TuyaDeviceState & HueCharacteristicData>

export class HueCharacteristic extends TuyaWebCharacteristic<ColorAccessory> {
    public static Title = 'Characteristic.Hue'

    public static HomekitCharacteristic(accessory: BaseAccessory) {
      return accessory.platform.Characteristic.Hue;
    }

    public static DEFAULT_VALUE = 0;

    public static isSupportedByAccessory(accessory): boolean {
      const configData = accessory.deviceConfig.data;
      return configData.color_mode !== undefined;
    }

    public getRemoteValue(callback: CharacteristicGetCallback): void {
      // Retrieve state from cache
      const cachedState = this.accessory.getCachedState(this.homekitCharacteristic);
      if (cachedState) {
        callback(null, cachedState);
      } else {
        // Retrieve device state from Tuya Web API
        this.accessory.platform.tuyaWebApi.getDeviceState<HueCharacteristicData>(this.accessory.deviceId).then((data) => {
          this.debug('[GET] %s', data?.color?.hue);
          this.updateValue(data, callback);
        }).catch((error) => {
          this.error('[GET] %s', error.message);
          this.accessory.invalidateCache();
          callback(error);
        });
      }
    }

    public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
      // Set device state in Tuya Web API
      const value = homekitValue as number;

      this.accessory.setColor({hue: value}).then(() => {
        this.debug('[SET] %s', value);
        this.accessory.setCachedState(this.homekitCharacteristic, homekitValue);
        callback();
      }).catch((error) => {
        this.error('[SET] %s', error.message);
        this.accessory.invalidateCache();
        callback(error);
      });
    }

    updateValue(data: DeviceWithHueCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
      let stateValue: number = HueCharacteristic.DEFAULT_VALUE;
      if (data?.color_mode !== undefined && data?.color_mode in COLOR_MODES && data?.color?.hue) {
        stateValue = Number(data.color.hue);
      }

      this.accessory.setCharacteristic(this.homekitCharacteristic, stateValue, !callback);
      callback && callback(null, stateValue);

    }
}
