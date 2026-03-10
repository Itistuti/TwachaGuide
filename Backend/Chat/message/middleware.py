from django.utils.deprecation import MiddlewareMixin

class DisableCSRF(MiddlewareMixin):
    def process_request(self, request):
        return None
    
    def process_view(self, request, callback, callback_args, callback_kwargs):
        return None
