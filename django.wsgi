import os
import sys

# Uncomment the following 2 lines if you are running from a virtualenv setup
#activate_this = '/home/fby/indivo/bin/activate_this.py'
#execfile(activate_this, dict(__file__=activate_this))

from django.core.handlers.wsgi import WSGIHandler

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)) + '/../')

# For production servers
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)) + '/../../')

os.environ['DJANGO_SETTINGS_MODULE'] = 'indivo_ui_server.settings'

class AdjEnvironMiddleware:

  def __init__(self, application):
    self.application = application

  def __call__(self, environ, start_response):
    environ['RAW_PATH_INFO'] = environ['PATH_INFO']

    def _start_response(status, headers):
      return start_response(status, headers)

    return self.application(environ, _start_response)

application = AdjEnvironMiddleware(WSGIHandler())
