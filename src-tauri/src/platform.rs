#[cfg(target_os = "macos")]
use core_foundation::{
    base::{CFTypeRef, TCFType},
    boolean::CFBoolean,
    dictionary::{CFDictionary, CFDictionaryRef},
    string::{CFString, CFStringRef},
};

#[cfg(target_os = "macos")]
use std::{ffi::c_void, ptr};

#[cfg(target_os = "macos")]
type AXUIElementRef = *const c_void;

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(options: CFDictionaryRef) -> bool;
    fn AXUIElementCreateSystemWide() -> AXUIElementRef;
    fn AXUIElementCopyAttributeValue(
        element: AXUIElementRef,
        attribute: CFStringRef,
        value: *mut CFTypeRef,
    ) -> i32;
    static kAXTrustedCheckOptionPrompt: CFStringRef;
}

#[cfg(target_os = "macos")]
#[link(name = "CoreFoundation", kind = "framework")]
unsafe extern "C" {
    fn CFEqual(left: CFTypeRef, right: CFTypeRef) -> u8;
    fn CFRelease(value: CFTypeRef);
}

#[cfg(target_os = "macos")]
pub fn accessibility_granted() -> bool {
    // Read-only system preflight: it does not trigger a prompt or mutate the
    // user's privacy settings.
    unsafe { AXIsProcessTrusted() }
}

#[cfg(target_os = "macos")]
pub fn request_accessibility() -> bool {
    let prompt_key = unsafe { CFString::wrap_under_get_rule(kAXTrustedCheckOptionPrompt) };
    let options = CFDictionary::from_CFType_pairs(&[(prompt_key, CFBoolean::true_value())]);

    // macOS presents the permission prompt asynchronously, so a false return
    // value is expected until the user grants access in System Settings.
    unsafe { AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef()) }
}

#[cfg(target_os = "macos")]
#[derive(Debug)]
pub struct FocusedWindow {
    element: AXUIElementRef,
}

#[cfg(target_os = "macos")]
impl FocusedWindow {
    pub fn capture() -> Result<Self, String> {
        let system = unsafe { AXUIElementCreateSystemWide() };
        if system.is_null() {
            return Err("No se pudo identificar la ventana objetivo de macOS.".into());
        }

        let focused_application_attribute = CFString::new("AXFocusedApplication");
        let application = unsafe {
            copy_ax_attribute(system, focused_application_attribute.as_concrete_TypeRef())
        };
        unsafe { CFRelease(system.cast()) };
        let Some(application) = application else {
            return Err(
                "No se pudo identificar la aplicación objetivo. Enfocá un campo de texto antes de que termine la cuenta regresiva."
                    .into(),
            );
        };

        let focused_window_attribute = CFString::new("AXFocusedWindow");
        let window = unsafe {
            copy_ax_attribute(
                application.cast(),
                focused_window_attribute.as_concrete_TypeRef(),
            )
        };
        unsafe { CFRelease(application) };
        let Some(window) = window else {
            return Err(
                "No se pudo identificar la ventana objetivo. Enfocá una ventana con un campo de texto antes de que termine la cuenta regresiva."
                    .into(),
            );
        };

        Ok(Self {
            element: window.cast(),
        })
    }

    pub fn is_active(&self) -> bool {
        let Ok(current) = Self::capture() else {
            return false;
        };
        unsafe { CFEqual(self.element.cast(), current.element.cast()) != 0 }
    }
}

#[cfg(target_os = "macos")]
impl Drop for FocusedWindow {
    fn drop(&mut self) {
        unsafe { CFRelease(self.element.cast()) };
    }
}

#[cfg(target_os = "macos")]
unsafe fn copy_ax_attribute(element: AXUIElementRef, attribute: CFStringRef) -> Option<CFTypeRef> {
    let mut value = ptr::null();
    let result = unsafe { AXUIElementCopyAttributeValue(element, attribute, &mut value) };
    (result == 0 && !value.is_null()).then_some(value)
}

#[cfg(target_os = "windows")]
#[derive(Debug, Clone, Copy)]
pub struct FocusedWindow {
    handle: *mut std::ffi::c_void,
}

#[cfg(target_os = "windows")]
#[link(name = "user32")]
unsafe extern "system" {
    fn GetForegroundWindow() -> *mut std::ffi::c_void;
}

#[cfg(target_os = "windows")]
impl FocusedWindow {
    pub fn capture() -> Result<Self, String> {
        let handle = unsafe { GetForegroundWindow() };
        if handle.is_null() {
            return Err(
                "No se pudo identificar la ventana objetivo. Enfocá una ventana antes de que termine la cuenta regresiva."
                    .into(),
            );
        }
        Ok(Self { handle })
    }

    pub fn is_active(&self) -> bool {
        unsafe { GetForegroundWindow() == self.handle }
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
#[derive(Debug)]
pub struct FocusedWindow;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
impl FocusedWindow {
    pub fn capture() -> Result<Self, String> {
        Err("La protección de ventana sólo está disponible en macOS y Windows.".into())
    }

    pub fn is_active(&self) -> bool {
        false
    }
}

pub fn focus_guard_supported() -> bool {
    cfg!(any(target_os = "macos", target_os = "windows"))
}

#[cfg(not(target_os = "macos"))]
pub fn accessibility_granted() -> bool {
    true
}

#[cfg(not(target_os = "macos"))]
pub fn request_accessibility() -> bool {
    true
}
